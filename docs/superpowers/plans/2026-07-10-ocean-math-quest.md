# Ocean Math Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based, mastery-gated multiplication flashcard app (tables 2×–12×) themed as an ocean quest, with zero backend, for one child's practice.

**Architecture:** A pure-function mastery/queue engine (fully unit-tested, no React) sits under a thin React UI. All persistent state is a single versioned JSON document in `localStorage`, managed through one React context. Screens are simple, prop-driven components with no routing library — a single `useState` state machine in `App.tsx` switches between them.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + @testing-library/react for tests. No backend, no external UI/animation libraries, no accounts.

## Global Constraints

- No backend, no accounts, no ads, no paywalls — everything runs client-side in the browser.
- Persistence is `localStorage` only, behind a versioned schema (`SCHEMA_VERSION`) with an explicit migration hook.
- Session size: 20 cards per session (`SESSION_SIZE = 20`).
- Review mix: ~25% of a session's cards come from already-mastered tables (`REVIEW_RATIO = 0.25`).
- Recall threshold: an answer counts as "recalled" (fluent) if correct and answered in ≤ 3000 ms (`RECALL_THRESHOLD_MS = 3000`).
- Fact mastery: a fact is "mastered" after ≥ 3 recalled answers (`MASTERY_RECALL_COUNT = 3`) spanning ≥ 2 distinct calendar days (`MASTERY_MIN_DISTINCT_DAYS = 2`).
- Zone (table) order: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 — a zone is mastered when every fact `table × 2` through `table × 12` is mastered.
- Missed cards re-queue later in the same session (the child never ends a session having gotten a fact wrong last).
- The engine (mastery, zone, queue logic) must be pure functions with no DOM/React dependency, so it is unit-testable in isolation and portable if a backend is ever added.
- Data model must be designed so a future "division mode" (rendering the same fact family as `product ÷ a = ?`) needs no migration — out of scope to build now, but nothing here should block it.

**Deviation from the design spec's data model:** the spec's sketch included a `zones: Record<number, ZoneState>` field in `AppState`. This plan omits it — zone/table mastery is derived from `facts` on read (`isZoneMastered`, `currentUnlockedZone` in Task 4) rather than stored redundantly, which removes a class of state-desync bugs (stored zone status disagreeing with the facts that determine it) at no cost to any spec-required behavior (unlock order, heatmap, celebration trigger all still work).

---

### Task 1: Project scaffold and test tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` (via Vite scaffold)
- Create: `src/test/setup.ts`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: a working Vite + React + TS project with `npm test` running Vitest in jsdom mode, and `npm run build` producing a static `dist/`.

- [ ] **Step 1: Scaffold the Vite React-TS project**

Run in `/home/rick/Documents/code/ocean-math-quest`:
```bash
npm create vite@latest . -- --template react-ts --force
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 4: Configure Vitest in `vite.config.ts`**

Replace the file contents with:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
```

- [ ] **Step 5: Create the test setup file**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Add the test script**

Edit `package.json`, in `"scripts"` add:
```json
"test": "vitest run"
```

- [ ] **Step 7: Replace the placeholder App with a minimal shell**

Replace `src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="app">
      <h1>Ocean Math Quest</h1>
    </div>
  );
}
```

- [ ] **Step 8: Write the smoke test**

Create `src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Ocean Math Quest')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the tests**

Run: `npm test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 10: Verify the production build**

Run: `npm run build`
Expected: build succeeds, `dist/` created with no errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite/React/TS project with Vitest"
```

---

### Task 2: Fact/zone types and zone definitions

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/engine/zones.ts`
- Test: `src/engine/zones.test.ts`

**Interfaces:**
- Produces:
  - `Attempt { date: string; ms: number; correct: boolean }`
  - `FactMastery = 'unseen' | 'learning' | 'known' | 'mastered'`
  - `FactState { a: number; b: number; attempts: Attempt[]; mastery: FactMastery; lastSeen: string | null }`
  - `ZoneDefinition { table: number; name: string; creature: string }`
  - `ZONES: ZoneDefinition[]` (tables 2..12, in order)
  - `factKeyFor(a: number, b: number): string`
  - `factsForZone(table: number): Array<{ a: number; b: number }>`

- [ ] **Step 1: Write the failing test for `factKeyFor` and `factsForZone`**

Create `src/engine/zones.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { factKeyFor, factsForZone, ZONES } from './zones';

describe('factKeyFor', () => {
  it('produces the same key regardless of argument order', () => {
    expect(factKeyFor(3, 7)).toBe(factKeyFor(7, 3));
  });

  it('produces a low-high formatted key', () => {
    expect(factKeyFor(7, 3)).toBe('3-7');
  });
});

describe('factsForZone', () => {
  it('returns 11 facts for a table, one per multiplier 2..12', () => {
    const facts = factsForZone(6);
    expect(facts).toHaveLength(11);
    expect(facts[0]).toEqual({ a: 6, b: 2 });
    expect(facts[10]).toEqual({ a: 6, b: 12 });
  });
});

describe('ZONES', () => {
  it('covers tables 2 through 12 in order', () => {
    expect(ZONES.map(z => z.table)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('gives every zone a unique name and creature', () => {
    const names = new Set(ZONES.map(z => z.name));
    const creatures = new Set(ZONES.map(z => z.creature));
    expect(names.size).toBe(ZONES.length);
    expect(creatures.size).toBe(ZONES.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- zones`
Expected: FAIL — `src/engine/zones.ts` does not exist.

- [ ] **Step 3: Create the types file**

Create `src/engine/types.ts`:
```ts
export interface Attempt {
  date: string; // ISO calendar date, e.g. "2026-07-10"
  ms: number;
  correct: boolean;
}

export type FactMastery = 'unseen' | 'learning' | 'known' | 'mastered';

export interface FactState {
  a: number;
  b: number;
  attempts: Attempt[];
  mastery: FactMastery;
  lastSeen: string | null;
}

export interface ZoneDefinition {
  table: number;
  name: string;
  creature: string;
}
```

- [ ] **Step 4: Create the zones file**

Create `src/engine/zones.ts`:
```ts
import { ZoneDefinition } from './types';

export const ZONES: ZoneDefinition[] = [
  { table: 2, name: 'Sunlit Reef', creature: 'Clownfish' },
  { table: 3, name: 'Shallow Shelf', creature: 'Sea Turtle' },
  { table: 4, name: 'Kelp Forest', creature: 'Sea Otter' },
  { table: 5, name: 'Coral Canyon', creature: 'Octopus' },
  { table: 6, name: 'Open Water', creature: 'Dolphin' },
  { table: 7, name: 'Twilight Zone', creature: 'Hammerhead Shark' },
  { table: 8, name: 'Midnight Zone', creature: 'Anglerfish' },
  { table: 9, name: 'Deep Current', creature: 'Giant Squid' },
  { table: 10, name: 'Volcanic Vent', creature: 'Vampire Squid' },
  { table: 11, name: 'Abyssal Plain', creature: 'Gulper Eel' },
  { table: 12, name: 'The Trench', creature: 'Colossal Kraken' },
];

export function factKeyFor(a: number, b: number): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}-${hi}`;
}

export function factsForZone(table: number): Array<{ a: number; b: number }> {
  const facts: Array<{ a: number; b: number }> = [];
  for (let b = 2; b <= 12; b++) {
    facts.push({ a: table, b });
  }
  return facts;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- zones`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/zones.ts src/engine/zones.test.ts
git commit -m "feat: add fact/zone types and zone definitions"
```

---

### Task 3: Mastery engine (fact-level)

**Files:**
- Create: `src/engine/masteryEngine.ts`
- Test: `src/engine/masteryEngine.test.ts`

**Interfaces:**
- Consumes: `Attempt`, `FactState`, `FactMastery` from `src/engine/types.ts`
- Produces:
  - `RECALL_THRESHOLD_MS = 3000`
  - `MASTERY_RECALL_COUNT = 3`
  - `MASTERY_MIN_DISTINCT_DAYS = 2`
  - `MAX_ATTEMPTS_HISTORY = 20`
  - `computeFactMastery(attempts: Attempt[]): FactMastery`
  - `recordAttempt(fact: FactState, attempt: Attempt): FactState`

- [ ] **Step 1: Write the failing tests**

Create `src/engine/masteryEngine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeFactMastery, recordAttempt } from './masteryEngine';
import { FactState } from './types';

describe('computeFactMastery', () => {
  it('returns unseen for no attempts', () => {
    expect(computeFactMastery([])).toBe('unseen');
  });

  it('returns learning after a wrong answer', () => {
    expect(computeFactMastery([{ date: '2026-07-10', ms: 1000, correct: false }])).toBe('learning');
  });

  it('returns known after a slow but correct answer', () => {
    expect(computeFactMastery([{ date: '2026-07-10', ms: 5000, correct: true }])).toBe('known');
  });

  it('does not master on 3 fast-correct answers within a single day', () => {
    const attempts = [
      { date: '2026-07-10', ms: 1000, correct: true },
      { date: '2026-07-10', ms: 1200, correct: true },
      { date: '2026-07-10', ms: 900, correct: true },
    ];
    expect(computeFactMastery(attempts)).toBe('known');
  });

  it('masters after 3 fast-correct answers spanning 2 distinct days', () => {
    const attempts = [
      { date: '2026-07-10', ms: 1000, correct: true },
      { date: '2026-07-10', ms: 1200, correct: true },
      { date: '2026-07-11', ms: 900, correct: true },
    ];
    expect(computeFactMastery(attempts)).toBe('mastered');
  });

  it('does not count slow-correct answers toward mastery', () => {
    const attempts = [
      { date: '2026-07-10', ms: 5000, correct: true },
      { date: '2026-07-11', ms: 5000, correct: true },
      { date: '2026-07-12', ms: 5000, correct: true },
    ];
    expect(computeFactMastery(attempts)).toBe('known');
  });
});

describe('recordAttempt', () => {
  const baseFact: FactState = { a: 6, b: 7, attempts: [], mastery: 'unseen', lastSeen: null };

  it('appends the attempt and recomputes mastery and lastSeen', () => {
    const result = recordAttempt(baseFact, { date: '2026-07-10', ms: 1000, correct: true });
    expect(result.attempts).toHaveLength(1);
    expect(result.mastery).toBe('known');
    expect(result.lastSeen).toBe('2026-07-10');
  });

  it('caps attempt history at 20', () => {
    let fact = baseFact;
    for (let i = 0; i < 25; i++) {
      fact = recordAttempt(fact, { date: '2026-07-10', ms: 1000, correct: true });
    }
    expect(fact.attempts).toHaveLength(20);
  });

  it('does not mutate the original fact', () => {
    const result = recordAttempt(baseFact, { date: '2026-07-10', ms: 1000, correct: true });
    expect(baseFact.attempts).toHaveLength(0);
    expect(result).not.toBe(baseFact);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- masteryEngine`
Expected: FAIL — `src/engine/masteryEngine.ts` does not exist.

- [ ] **Step 3: Implement the mastery engine**

Create `src/engine/masteryEngine.ts`:
```ts
import { Attempt, FactMastery, FactState } from './types';

export const RECALL_THRESHOLD_MS = 3000;
export const MASTERY_RECALL_COUNT = 3;
export const MASTERY_MIN_DISTINCT_DAYS = 2;
export const MAX_ATTEMPTS_HISTORY = 20;

export function computeFactMastery(attempts: Attempt[]): FactMastery {
  if (attempts.length === 0) return 'unseen';

  const recalled = attempts.filter(a => a.correct && a.ms <= RECALL_THRESHOLD_MS);
  const distinctRecalledDays = new Set(recalled.map(a => a.date));

  if (recalled.length >= MASTERY_RECALL_COUNT && distinctRecalledDays.size >= MASTERY_MIN_DISTINCT_DAYS) {
    return 'mastered';
  }

  const last = attempts[attempts.length - 1];
  return last.correct ? 'known' : 'learning';
}

export function recordAttempt(fact: FactState, attempt: Attempt): FactState {
  const attempts = [...fact.attempts, attempt].slice(-MAX_ATTEMPTS_HISTORY);
  return {
    ...fact,
    attempts,
    mastery: computeFactMastery(attempts),
    lastSeen: attempt.date,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- masteryEngine`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/masteryEngine.ts src/engine/masteryEngine.test.ts
git commit -m "feat: add fact mastery engine"
```

---

### Task 4: Zone mastery and unlock logic

**Files:**
- Modify: `src/engine/zones.ts`
- Modify: `src/engine/zones.test.ts`

**Interfaces:**
- Consumes: `FactState`, `FactMastery` from `types.ts`; `ZONES`, `factKeyFor`, `factsForZone` from `zones.ts`
- Produces:
  - `isZoneMastered(table: number, facts: Record<string, FactState>): boolean`
  - `currentUnlockedZone(facts: Record<string, FactState>): number`

- [ ] **Step 1: Write the failing tests**

Append to `src/engine/zones.test.ts`:
```ts
import { isZoneMastered, currentUnlockedZone } from './zones';
import { FactState } from './types';

function masteredFact(a: number, b: number): FactState {
  return { a, b, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' };
}

describe('isZoneMastered', () => {
  it('is false when no facts are recorded', () => {
    expect(isZoneMastered(2, {})).toBe(false);
  });

  it('is true only when every fact 2..12 for the table is mastered', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      facts[factKeyFor(2, b)] = masteredFact(2, b);
    }
    expect(isZoneMastered(2, facts)).toBe(true);
  });

  it('is false if even one fact in the table is not mastered', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      facts[factKeyFor(2, b)] = masteredFact(2, b);
    }
    facts[factKeyFor(2, 12)] = { a: 2, b: 12, attempts: [], mastery: 'known', lastSeen: '2026-07-10' };
    expect(isZoneMastered(2, facts)).toBe(false);
  });
});

describe('currentUnlockedZone', () => {
  it('starts at table 2 with no facts recorded', () => {
    expect(currentUnlockedZone({})).toBe(2);
  });

  it('advances to the next unmastered table', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      facts[factKeyFor(2, b)] = masteredFact(2, b);
    }
    expect(currentUnlockedZone(facts)).toBe(3);
  });

  it('stays on 12 once every table is mastered', () => {
    const facts: Record<string, FactState> = {};
    for (let table = 2; table <= 12; table++) {
      for (let b = 2; b <= 12; b++) {
        facts[factKeyFor(table, b)] = masteredFact(table, b);
      }
    }
    expect(currentUnlockedZone(facts)).toBe(12);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- zones`
Expected: FAIL — `isZoneMastered` and `currentUnlockedZone` are not exported.

- [ ] **Step 3: Implement zone mastery and unlock logic**

Append to `src/engine/zones.ts`:
```ts
import { FactState } from './types';

export function isZoneMastered(table: number, facts: Record<string, FactState>): boolean {
  return factsForZone(table).every(({ a, b }) => {
    const key = factKeyFor(a, b);
    return facts[key]?.mastery === 'mastered';
  });
}

export function currentUnlockedZone(facts: Record<string, FactState>): number {
  for (const zone of ZONES) {
    if (!isZoneMastered(zone.table, facts)) {
      return zone.table;
    }
  }
  return ZONES[ZONES.length - 1].table;
}
```

(Merge the `import { FactState } from './types';` into the existing import line from Task 2 rather than duplicating it.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- zones`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/zones.ts src/engine/zones.test.ts
git commit -m "feat: add zone mastery and unlock logic"
```

---

### Task 5: Session queue builder

**Files:**
- Create: `src/engine/queueBuilder.ts`
- Test: `src/engine/queueBuilder.test.ts`

**Interfaces:**
- Consumes: `factsForZone`, `factKeyFor` from `zones.ts`; `FactState` from `types.ts`
- Produces:
  - `SESSION_SIZE = 20`
  - `REVIEW_RATIO = 0.25`
  - `QueueCard { a: number; b: number; key: string }`
  - `buildSessionQueue(currentTable: number, facts: Record<string, FactState>, rng?: () => number): QueueCard[]`

- [ ] **Step 1: Write the failing tests**

Create `src/engine/queueBuilder.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildSessionQueue, SESSION_SIZE } from './queueBuilder';
import { factKeyFor } from './zones';
import { FactState } from './types';

function fixedRng() {
  return () => 0.5; // deterministic "shuffle"
}

describe('buildSessionQueue', () => {
  it('returns exactly SESSION_SIZE cards', () => {
    const queue = buildSessionQueue(2, {}, fixedRng());
    expect(queue).toHaveLength(SESSION_SIZE);
  });

  it('only draws current-table cards when no facts are mastered yet', () => {
    const queue = buildSessionQueue(2, {}, fixedRng());
    expect(queue.every(card => card.a === 2 || card.b === 2)).toBe(true);
  });

  it('mixes in review cards from mastered tables', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      const key = factKeyFor(5, b);
      facts[key] = { a: 5, b, attempts: [], mastery: 'mastered', lastSeen: '2026-07-01' };
    }
    const queue = buildSessionQueue(6, facts, fixedRng());
    const reviewCards = queue.filter(card => card.a === 5 || card.b === 5);
    expect(reviewCards.length).toBeGreaterThan(0);
    expect(reviewCards.length).toBeLessThanOrEqual(Math.round(SESSION_SIZE * 0.25));
  });

  it('prioritizes learning facts over unseen facts in the current table', () => {
    const facts: Record<string, FactState> = {};
    const learningKey = factKeyFor(4, 9);
    facts[learningKey] = { a: 4, b: 9, attempts: [], mastery: 'learning', lastSeen: '2026-07-01' };
    const queue = buildSessionQueue(4, facts, fixedRng());
    const learningCount = queue.filter(card => card.key === learningKey).length;
    expect(learningCount).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- queueBuilder`
Expected: FAIL — `src/engine/queueBuilder.ts` does not exist.

- [ ] **Step 3: Implement the queue builder**

Create `src/engine/queueBuilder.ts`:
```ts
import { factKeyFor, factsForZone } from './zones';
import { FactMastery, FactState } from './types';

export const SESSION_SIZE = 20;
export const REVIEW_RATIO = 0.25;

export interface QueueCard {
  a: number;
  b: number;
  key: string;
}

function priorityFor(mastery: FactMastery | undefined): number {
  switch (mastery) {
    case 'learning':
      return 0;
    case 'known':
      return 1;
    case 'mastered':
      return 3;
    case 'unseen':
    default:
      return 2;
  }
}

function repeatToLength<T>(items: T[], length: number): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < length; i++) {
    out.push(items[i % items.length]);
  }
  return out;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildSessionQueue(
  currentTable: number,
  facts: Record<string, FactState>,
  rng: () => number = Math.random
): QueueCard[] {
  const reviewCount = Math.round(SESSION_SIZE * REVIEW_RATIO);
  const currentCount = SESSION_SIZE - reviewCount;

  const currentFacts: QueueCard[] = factsForZone(currentTable).map(({ a, b }) => ({
    a,
    b,
    key: factKeyFor(a, b),
  }));

  const sortedCurrent = [...currentFacts].sort(
    (x, y) => priorityFor(facts[x.key]?.mastery) - priorityFor(facts[y.key]?.mastery)
  );
  const currentPicks = repeatToLength(sortedCurrent, currentCount);

  const masteredFacts: QueueCard[] = Object.entries(facts)
    .filter(([, state]) => state.mastery === 'mastered')
    .map(([key, state]) => ({ a: state.a, b: state.b, key }));

  const sortedByLeastRecentlySeen = [...masteredFacts].sort((x, y) => {
    const lx = facts[x.key]?.lastSeen ?? '';
    const ly = facts[y.key]?.lastSeen ?? '';
    return lx.localeCompare(ly);
  });

  const reviewPicks =
    masteredFacts.length > 0
      ? repeatToLength(sortedByLeastRecentlySeen, reviewCount)
      : repeatToLength(sortedCurrent, reviewCount);

  return shuffle([...currentPicks, ...reviewPicks], rng);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- queueBuilder`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/queueBuilder.ts src/engine/queueBuilder.test.ts
git commit -m "feat: add session queue builder with review mixing"
```

---

### Task 6: Persistence layer (schema + localStorage)

**Files:**
- Create: `src/storage/schema.ts`
- Create: `src/storage/persistence.ts`
- Test: `src/storage/persistence.test.ts`

**Interfaces:**
- Consumes: `FactState` from `src/engine/types.ts`
- Produces:
  - `SCHEMA_VERSION = 1`, `STORAGE_KEY`
  - `SessionSummary { date: string; table: number; stars: 1 | 2 | 3; cardsCorrect: number; cardsTotal: number; newlyMastered: string[] }`
  - `AppState { version: number; profile: { name: string; muted: boolean }; facts: Record<string, FactState>; sessions: SessionSummary[] }`
  - `createDefaultState(): AppState`
  - `loadState(): AppState`
  - `saveState(state: AppState): void`
  - `migrateState(parsed: unknown): AppState`
  - `exportStateJson(state: AppState): string`
  - `importStateJson(json: string): AppState`

- [ ] **Step 1: Write the failing tests**

Create `src/storage/persistence.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, exportStateJson, importStateJson } from './persistence';
import { createDefaultState, STORAGE_KEY } from './schema';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns a default state when nothing is stored', () => {
    const state = loadState();
    expect(state.version).toBe(1);
    expect(state.facts).toEqual({});
    expect(state.sessions).toEqual([]);
  });

  it('saveState then loadState round-trips the data', () => {
    const state = createDefaultState();
    state.facts['2-3'] = { a: 2, b: 3, attempts: [], mastery: 'known', lastSeen: '2026-07-10' };
    saveState(state);
    const loaded = loadState();
    expect(loaded.facts['2-3'].mastery).toBe('known');
  });

  it('loadState falls back to default on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const state = loadState();
    expect(state).toEqual(createDefaultState());
  });

  it('loadState falls back to default on an unknown schema version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }));
    const state = loadState();
    expect(state).toEqual(createDefaultState());
  });

  it('exportStateJson and importStateJson round-trip', () => {
    const state = createDefaultState();
    state.facts['4-4'] = { a: 4, b: 4, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' };
    const json = exportStateJson(state);
    const imported = importStateJson(json);
    expect(imported.facts['4-4'].mastery).toBe('mastered');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- persistence`
Expected: FAIL — `src/storage/persistence.ts` and `src/storage/schema.ts` do not exist.

- [ ] **Step 3: Create the schema file**

Create `src/storage/schema.ts`:
```ts
import { FactState } from '../engine/types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'ocean-math-quest:v1';

export interface SessionSummary {
  date: string;
  table: number;
  stars: 1 | 2 | 3;
  cardsCorrect: number;
  cardsTotal: number;
  newlyMastered: string[];
}

export interface AppState {
  version: number;
  profile: { name: string; muted: boolean };
  facts: Record<string, FactState>;
  sessions: SessionSummary[];
}

export function createDefaultState(): AppState {
  return {
    version: SCHEMA_VERSION,
    profile: { name: 'Explorer', muted: false },
    facts: {},
    sessions: [],
  };
}
```

- [ ] **Step 4: Create the persistence file**

Create `src/storage/persistence.ts`:
```ts
import { AppState, createDefaultState, SCHEMA_VERSION, STORAGE_KEY } from './schema';

export function migrateState(parsed: unknown): AppState {
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { version?: unknown }).version !== 'number'
  ) {
    return createDefaultState();
  }
  const candidate = parsed as AppState;
  if (candidate.version === SCHEMA_VERSION) {
    return candidate;
  }
  // Future schema migrations, chained by version number, go here.
  return createDefaultState();
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();
  try {
    return migrateState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateJson(json: string): AppState {
  return migrateState(JSON.parse(json));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- persistence`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/storage/schema.ts src/storage/persistence.ts src/storage/persistence.test.ts
git commit -m "feat: add versioned localStorage persistence layer"
```

---

### Task 7: NumberPad component

**Files:**
- Create: `src/components/NumberPad.tsx`
- Test: `src/components/NumberPad.test.tsx`

**Interfaces:**
- Produces: `NumberPad` React component, props `{ value: string; onDigit: (digit: string) => void; onBackspace: () => void; onSubmit: () => void; disabled?: boolean }`. Digit buttons are accessible by role `button` with name `"0"`..`"9"`; backspace and submit buttons use `aria-label="backspace"` / `aria-label="submit"`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/NumberPad.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberPad } from './NumberPad';

describe('NumberPad', () => {
  it('calls onDigit with the clicked digit', async () => {
    const onDigit = vi.fn();
    render(<NumberPad value="" onDigit={onDigit} onBackspace={vi.fn()} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    expect(onDigit).toHaveBeenCalledWith('7');
  });

  it('calls onBackspace when backspace is clicked', async () => {
    const onBackspace = vi.fn();
    render(<NumberPad value="12" onDigit={vi.fn()} onBackspace={onBackspace} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'backspace' }));
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when submit is clicked', async () => {
    const onSubmit = vi.fn();
    render(<NumberPad value="12" onDigit={vi.fn()} onBackspace={vi.fn()} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables all buttons when disabled is true', () => {
    render(<NumberPad value="" onDigit={vi.fn()} onBackspace={vi.fn()} onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'submit' })).toBeDisabled();
  });

  it('displays the current value', () => {
    render(<NumberPad value="42" onDigit={vi.fn()} onBackspace={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('number-pad-display')).toHaveTextContent('42');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- NumberPad`
Expected: FAIL — `src/components/NumberPad.tsx` does not exist.

- [ ] **Step 3: Implement NumberPad**

Create `src/components/NumberPad.tsx`:
```tsx
interface NumberPadProps {
  value: string;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function NumberPad({ value, onDigit, onBackspace, onSubmit, disabled = false }: NumberPadProps) {
  return (
    <div className="number-pad">
      <div className="number-pad-display" data-testid="number-pad-display">
        {value || ' '}
      </div>
      <div className="number-pad-grid">
        {DIGITS.map(digit => (
          <button key={digit} type="button" disabled={disabled} onClick={() => onDigit(digit)}>
            {digit}
          </button>
        ))}
        <button type="button" disabled={disabled} onClick={onBackspace} aria-label="backspace">
          ⌫
        </button>
        <button type="button" disabled={disabled} onClick={onSubmit} aria-label="submit">
          ✓
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- NumberPad`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/NumberPad.tsx src/components/NumberPad.test.tsx
git commit -m "feat: add NumberPad component"
```

---

### Task 8: ComboMeter component

**Files:**
- Create: `src/components/ComboMeter.tsx`
- Test: `src/components/ComboMeter.test.tsx`

**Interfaces:**
- Produces: `ComboMeter` React component, props `{ combo: number }`. Renders `data-testid="combo-meter"` with class `combo-meter--none|bubbles|glow|burst` based on tiers: 0–2 none, 3–5 bubbles, 6–9 glow, 10+ burst. Text content is `"Combo: {combo}"` when `combo > 0`, else empty.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ComboMeter.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComboMeter } from './ComboMeter';

describe('ComboMeter', () => {
  it('shows no combo text at zero', () => {
    render(<ComboMeter combo={0} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--none');
    expect(screen.getByTestId('combo-meter').textContent).toBe('');
  });

  it('reaches the bubbles tier at 3', () => {
    render(<ComboMeter combo={3} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--bubbles');
  });

  it('reaches the glow tier at 6', () => {
    render(<ComboMeter combo={6} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--glow');
  });

  it('reaches the burst tier at 10 and shows the combo count', () => {
    render(<ComboMeter combo={10} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--burst');
    expect(screen.getByTestId('combo-meter').textContent).toBe('Combo: 10');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- ComboMeter`
Expected: FAIL — `src/components/ComboMeter.tsx` does not exist.

- [ ] **Step 3: Implement ComboMeter**

Create `src/components/ComboMeter.tsx`:
```tsx
interface ComboMeterProps {
  combo: number;
}

type Tier = 'none' | 'bubbles' | 'glow' | 'burst';

function tierFor(combo: number): Tier {
  if (combo >= 10) return 'burst';
  if (combo >= 6) return 'glow';
  if (combo >= 3) return 'bubbles';
  return 'none';
}

export function ComboMeter({ combo }: ComboMeterProps) {
  const tier = tierFor(combo);
  return (
    <div className={`combo-meter combo-meter--${tier}`} data-testid="combo-meter">
      {combo > 0 ? `Combo: ${combo}` : ''}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- ComboMeter`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ComboMeter.tsx src/components/ComboMeter.test.tsx
git commit -m "feat: add ComboMeter component"
```

---

### Task 9: App state store (React context over persistence + mastery engine)

**Files:**
- Create: `src/store/AppStateContext.tsx`
- Test: `src/store/AppStateContext.test.tsx`

**Interfaces:**
- Consumes: `loadState`, `saveState`, `exportStateJson`, `importStateJson` from `src/storage/persistence.ts`; `recordAttempt` from `src/engine/masteryEngine.ts`; `factKeyFor` from `src/engine/zones.ts`; `AppState`, `SessionSummary` from `src/storage/schema.ts`; `Attempt`, `FactState` from `src/engine/types.ts`
- Produces:
  - `AppStateProvider({ children }): JSX.Element`
  - `useAppState(): { state: AppState; recordFactAttempt: (a: number, b: number, attempt: Attempt) => void; addSession: (summary: SessionSummary) => void; exportState: () => string; importState: (json: string) => void }`

- [ ] **Step 1: Write the failing tests**

Create `src/store/AppStateContext.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppStateProvider, useAppState } from './AppStateContext';
import { loadState } from '../storage/persistence';

function TestConsumer() {
  const { state, recordFactAttempt, addSession } = useAppState();
  return (
    <div>
      <span data-testid="mastery">{state.facts['3-4']?.mastery ?? 'unseen'}</span>
      <button
        onClick={() => recordFactAttempt(3, 4, { date: '2026-07-10', ms: 1000, correct: true })}
      >
        record
      </button>
      <button
        onClick={() =>
          addSession({ date: '2026-07-10', table: 3, stars: 3, cardsCorrect: 20, cardsTotal: 20, newlyMastered: [] })
        }
      >
        addSession
      </button>
      <span data-testid="sessionCount">{state.sessions.length}</span>
    </div>
  );
}

describe('AppStateContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts from the persisted default state', () => {
    render(
      <AppStateProvider>
        <TestConsumer />
      </AppStateProvider>
    );
    expect(screen.getByTestId('mastery')).toHaveTextContent('unseen');
  });

  it('recordFactAttempt updates state and persists to localStorage', async () => {
    render(
      <AppStateProvider>
        <TestConsumer />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('record'));
    expect(screen.getByTestId('mastery')).toHaveTextContent('known');
    expect(loadState().facts['3-4'].mastery).toBe('known');
  });

  it('addSession appends to session history and persists', async () => {
    render(
      <AppStateProvider>
        <TestConsumer />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('addSession'));
    expect(screen.getByTestId('sessionCount')).toHaveTextContent('1');
    expect(loadState().sessions).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- AppStateContext`
Expected: FAIL — `src/store/AppStateContext.tsx` does not exist.

- [ ] **Step 3: Implement the context**

Create `src/store/AppStateContext.tsx`:
```tsx
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, SessionSummary } from '../storage/schema';
import { exportStateJson, importStateJson, loadState, saveState } from '../storage/persistence';
import { recordAttempt } from '../engine/masteryEngine';
import { factKeyFor } from '../engine/zones';
import { Attempt, FactState } from '../engine/types';

interface AppStateContextValue {
  state: AppState;
  recordFactAttempt: (a: number, b: number, attempt: Attempt) => void;
  addSession: (summary: SessionSummary) => void;
  exportState: () => string;
  importState: (json: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  function recordFactAttempt(a: number, b: number, attempt: Attempt) {
    setState(prev => {
      const key = factKeyFor(a, b);
      const existing: FactState = prev.facts[key] ?? {
        a: Math.min(a, b),
        b: Math.max(a, b),
        attempts: [],
        mastery: 'unseen',
        lastSeen: null,
      };
      const updated = recordAttempt(existing, attempt);
      return { ...prev, facts: { ...prev.facts, [key]: updated } };
    });
  }

  function addSession(summary: SessionSummary) {
    setState(prev => ({ ...prev, sessions: [...prev.sessions, summary].slice(-50) }));
  }

  function exportState(): string {
    return exportStateJson(state);
  }

  function importState(json: string) {
    setState(importStateJson(json));
  }

  return (
    <AppStateContext.Provider value={{ state, recordFactAttempt, addSession, exportState, importState }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- AppStateContext`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/AppStateContext.tsx src/store/AppStateContext.test.tsx
git commit -m "feat: add AppStateProvider wiring persistence and mastery engine"
```

---

### Task 10: Drill screen (the play loop)

**Files:**
- Create: `src/screens/DrillScreen.tsx`
- Test: `src/screens/DrillScreen.test.tsx`

**Interfaces:**
- Consumes: `NumberPad` from `../components/NumberPad`; `ComboMeter` from `../components/ComboMeter`; `buildSessionQueue`, `QueueCard` from `../engine/queueBuilder`; `useAppState` from `../store/AppStateContext`; `SessionSummary` from `../storage/schema`
- Produces: `DrillScreen` component, props `{ table: number; onComplete: (summary: SessionSummary) => void }`. Renders `data-testid="card"` with text containing `"{a} × {b}"`, and `data-testid="progress"`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/DrillScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DrillScreen } from './DrillScreen';
import { AppStateProvider } from '../store/AppStateContext';

describe('DrillScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('runs a full session of correct answers and reports 3 stars', () => {
    const onComplete = vi.fn();
    render(
      <AppStateProvider>
        <DrillScreen table={2} onComplete={onComplete} />
      </AppStateProvider>
    );

    for (let i = 0; i < 20; i++) {
      const cardText = screen.getByTestId('card').textContent ?? '';
      const match = cardText.match(/(\d+)\s*×\s*(\d+)/);
      if (!match) throw new Error(`could not parse card text: ${cardText}`);
      const [, aStr, bStr] = match;
      const answer = String(Number(aStr) * Number(bStr));

      for (const digit of answer) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }
      fireEvent.click(screen.getByRole('button', { name: 'submit' }));

      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary.cardsTotal).toBe(20);
    expect(summary.cardsCorrect).toBe(20);
    expect(summary.stars).toBe(3);
    expect(summary.table).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- DrillScreen`
Expected: FAIL — `src/screens/DrillScreen.tsx` does not exist.

- [ ] **Step 3: Implement DrillScreen**

Create `src/screens/DrillScreen.tsx`:
```tsx
import { useRef, useState } from 'react';
import { NumberPad } from '../components/NumberPad';
import { ComboMeter } from '../components/ComboMeter';
import { buildSessionQueue, QueueCard } from '../engine/queueBuilder';
import { useAppState } from '../store/AppStateContext';
import { SessionSummary } from '../storage/schema';

const RECALL_THRESHOLD_MS = 3000;
const FEEDBACK_DELAY_MS = 600;

interface DrillScreenProps {
  table: number;
  onComplete: (summary: SessionSummary) => void;
}

export function DrillScreen({ table, onComplete }: DrillScreenProps) {
  const { state, recordFactAttempt, addSession } = useAppState();
  const [queue, setQueue] = useState<QueueCard[]>(() => buildSessionQueue(table, state.facts));
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const cardStartRef = useRef(performance.now());
  const statsRef = useRef({ correct: 0, total: 0, newlyMastered: new Set<string>() });

  const card = queue[index];
  if (!card) {
    return null;
  }

  function submit() {
    if (value === '') return;
    const elapsedMs = performance.now() - cardStartRef.current;
    const correct = Number(value) === card.a * card.b;
    const today = new Date().toISOString().slice(0, 10);

    statsRef.current.total += 1;
    if (correct) statsRef.current.correct += 1;

    const wasAlreadyMastered = state.facts[card.key]?.mastery === 'mastered';
    recordFactAttempt(card.a, card.b, { date: today, ms: elapsedMs, correct });

    if (correct && elapsedMs <= RECALL_THRESHOLD_MS) {
      setCombo(c => c + 1);
      if (!wasAlreadyMastered) {
        statsRef.current.newlyMastered.add(card.key);
      }
    } else {
      setCombo(0);
    }

    setFeedback(correct ? 'correct' : 'wrong');
    setValue('');

    setTimeout(() => {
      setFeedback(null);
      let nextQueue = queue;
      if (!correct) {
        nextQueue = [...queue, card];
        setQueue(nextQueue);
      }
      const nextIndex = index + 1;
      if (nextIndex >= nextQueue.length) {
        finishSession();
      } else {
        setIndex(nextIndex);
        cardStartRef.current = performance.now();
      }
    }, FEEDBACK_DELAY_MS);
  }

  function finishSession() {
    const { correct, total, newlyMastered } = statsRef.current;
    const accuracy = total === 0 ? 0 : correct / total;
    const stars: 1 | 2 | 3 = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    const summary: SessionSummary = {
      date: new Date().toISOString().slice(0, 10),
      table,
      stars,
      cardsCorrect: correct,
      cardsTotal: total,
      newlyMastered: Array.from(newlyMastered),
    };
    addSession(summary);
    onComplete(summary);
  }

  return (
    <div className="drill-screen">
      <ComboMeter combo={combo} />
      <div className="progress-dots" data-testid="progress">
        {index + 1} / {queue.length}
      </div>
      <div className={`card ${feedback ?? ''}`} data-testid="card">
        {card.a} &times; {card.b} = ?
      </div>
      <NumberPad
        value={value}
        onDigit={digit => setValue(v => v + digit)}
        onBackspace={() => setValue(v => v.slice(0, -1))}
        onSubmit={submit}
        disabled={feedback !== null}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- DrillScreen`
Expected: PASS (1 test). Note: this test drives 20 full card cycles and may take a few seconds — that's expected.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DrillScreen.tsx src/screens/DrillScreen.test.tsx
git commit -m "feat: add DrillScreen play loop with combo and requeue-on-miss"
```

---

### Task 11: Session results screen

**Files:**
- Create: `src/screens/SessionResults.tsx`
- Test: `src/screens/SessionResults.test.tsx`

**Interfaces:**
- Consumes: `SessionSummary` from `../storage/schema`; `ZONES` from `../engine/zones`
- Produces: `SessionResults` component, props `{ summary: SessionSummary; onPlayAgain: () => void; onHome: () => void }`.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/SessionResults.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionResults } from './SessionResults';
import { SessionSummary } from '../storage/schema';

const summary: SessionSummary = {
  date: '2026-07-10',
  table: 2,
  stars: 3,
  cardsCorrect: 20,
  cardsTotal: 20,
  newlyMastered: ['2-9', '2-11'],
};

describe('SessionResults', () => {
  it('shows the score and zone name', () => {
    render(<SessionResults summary={summary} onPlayAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByTestId('score')).toHaveTextContent('20 / 20');
    expect(screen.getByText('Sunlit Reef')).toBeInTheDocument();
  });

  it('shows newly mastered count when facts were mastered', () => {
    render(<SessionResults summary={summary} onPlayAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByTestId('newly-mastered')).toHaveTextContent('2 new facts mastered!');
  });

  it('calls onPlayAgain and onHome from their buttons', async () => {
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<SessionResults summary={summary} onPlayAgain={onPlayAgain} onHome={onHome} />);
    await userEvent.click(screen.getByText('Play again'));
    await userEvent.click(screen.getByText('Back to map'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- SessionResults`
Expected: FAIL — `src/screens/SessionResults.tsx` does not exist.

- [ ] **Step 3: Implement SessionResults**

Create `src/screens/SessionResults.tsx`:
```tsx
import { SessionSummary } from '../storage/schema';
import { ZONES } from '../engine/zones';

interface SessionResultsProps {
  summary: SessionSummary;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function SessionResults({ summary, onPlayAgain, onHome }: SessionResultsProps) {
  const zone = ZONES.find(z => z.table === summary.table);

  return (
    <div className="session-results">
      <h2>{'⭐'.repeat(summary.stars)}</h2>
      <p data-testid="score">
        {summary.cardsCorrect} / {summary.cardsTotal}
      </p>
      {summary.newlyMastered.length > 0 && (
        <p data-testid="newly-mastered">
          {summary.newlyMastered.length} new fact{summary.newlyMastered.length === 1 ? '' : 's'} mastered!
        </p>
      )}
      <p>{zone?.name}</p>
      <button type="button" onClick={onPlayAgain}>
        Play again
      </button>
      <button type="button" onClick={onHome}>
        Back to map
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- SessionResults`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/SessionResults.tsx src/screens/SessionResults.test.tsx
git commit -m "feat: add SessionResults screen"
```

---

### Task 12: Journey map (home) screen

**Files:**
- Create: `src/screens/JourneyMap.tsx`
- Test: `src/screens/JourneyMap.test.tsx`

**Interfaces:**
- Consumes: `ZONES`, `isZoneMastered`, `currentUnlockedZone` from `../engine/zones`; `useAppState` from `../store/AppStateContext`
- Produces: `JourneyMap` component, props `{ onPlay: (table: number) => void; onOpenParentCorner: () => void }`.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/JourneyMap.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JourneyMap } from './JourneyMap';
import { AppStateProvider } from '../store/AppStateContext';

describe('JourneyMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows a Play button for the current (first) zone and Locked for later ones', () => {
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(within(screen.getByTestId('zone-2')).getByText('Play')).toBeInTheDocument();
    expect(within(screen.getByTestId('zone-3')).getByText('Locked')).toBeInTheDocument();
  });

  it('calls onPlay with the table number when Play is clicked', async () => {
    const onPlay = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={onPlay} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    await userEvent.click(within(screen.getByTestId('zone-2')).getByText('Play'));
    expect(onPlay).toHaveBeenCalledWith(2);
  });

  it('calls onOpenParentCorner when the gear icon is clicked', async () => {
    const onOpenParentCorner = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onOpenParentCorner={onOpenParentCorner} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(onOpenParentCorner).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- JourneyMap`
Expected: FAIL — `src/screens/JourneyMap.tsx` does not exist.

- [ ] **Step 3: Implement JourneyMap**

Create `src/screens/JourneyMap.tsx`:
```tsx
import { currentUnlockedZone, isZoneMastered, ZONES } from '../engine/zones';
import { useAppState } from '../store/AppStateContext';

interface JourneyMapProps {
  onPlay: (table: number) => void;
  onOpenParentCorner: () => void;
}

export function JourneyMap({ onPlay, onOpenParentCorner }: JourneyMapProps) {
  const { state } = useAppState();
  const unlocked = currentUnlockedZone(state.facts);

  return (
    <div className="journey-map">
      <button
        type="button"
        className="parent-corner-gear"
        aria-label="parent corner"
        onClick={onOpenParentCorner}
      >
        ⚙
      </button>
      <ul>
        {ZONES.map(zone => {
          const mastered = isZoneMastered(zone.table, state.facts);
          const isCurrent = zone.table === unlocked;
          const isLocked = zone.table > unlocked;

          return (
            <li key={zone.table} data-testid={`zone-${zone.table}`}>
              <span>
                {zone.name} ({zone.table}s)
              </span>
              {mastered && <span data-testid={`creature-${zone.table}`}>{zone.creature}</span>}
              {!isLocked && (
                <button type="button" onClick={() => onPlay(zone.table)}>
                  {isCurrent ? 'Play' : 'Replay'}
                </button>
              )}
              {isLocked && <span>Locked</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- JourneyMap`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/JourneyMap.tsx src/screens/JourneyMap.test.tsx
git commit -m "feat: add JourneyMap home screen"
```

---

### Task 13: Parent corner screen (heatmap + export/import)

**Files:**
- Create: `src/screens/ParentCorner.tsx`
- Test: `src/screens/ParentCorner.test.tsx`

**Interfaces:**
- Consumes: `ZONES`, `factKeyFor` from `../engine/zones`; `useAppState` from `../store/AppStateContext`
- Produces: `ParentCorner` component, props `{ onBack: () => void }`.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/ParentCorner.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParentCorner } from './ParentCorner';
import { AppStateProvider } from '../store/AppStateContext';
import { saveState } from '../storage/persistence';
import { createDefaultState } from '../storage/schema';

describe('ParentCorner', () => {
  beforeEach(() => {
    localStorage.clear();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders a heatmap cell per fact with its mastery class', () => {
    const state = createDefaultState();
    state.facts['2-2'] = { a: 2, b: 2, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' };
    saveState(state);

    render(
      <AppStateProvider>
        <ParentCorner onBack={vi.fn()} />
      </AppStateProvider>
    );

    expect(screen.getByTestId('fact-2-2')).toHaveClass('mastery-mastered');
    expect(screen.getByTestId('fact-2-3')).toHaveClass('mastery-unseen');
  });

  it('does not throw when exporting progress', async () => {
    render(
      <AppStateProvider>
        <ParentCorner onBack={vi.fn()} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('Export progress'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('calls onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    render(
      <AppStateProvider>
        <ParentCorner onBack={onBack} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- ParentCorner`
Expected: FAIL — `src/screens/ParentCorner.tsx` does not exist.

- [ ] **Step 3: Implement ParentCorner**

Create `src/screens/ParentCorner.tsx`:
```tsx
import { useRef } from 'react';
import { factKeyFor, ZONES } from '../engine/zones';
import { useAppState } from '../store/AppStateContext';

interface ParentCornerProps {
  onBack: () => void;
}

const MULTIPLIERS = Array.from({ length: 11 }, (_, i) => i + 2);

export function ParentCorner({ onBack }: ParentCornerProps) {
  const { state, exportState, importState } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ocean-math-quest-progress.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importState(String(reader.result));
    reader.readAsText(file);
  }

  return (
    <div className="parent-corner">
      <button type="button" onClick={onBack}>
        Back
      </button>
      <table data-testid="mastery-heatmap">
        <thead>
          <tr>
            <th />
            {MULTIPLIERS.map(b => (
              <th key={b}>{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ZONES.map(zone => (
            <tr key={zone.table}>
              <th>{zone.table}</th>
              {MULTIPLIERS.map(b => {
                const key = factKeyFor(zone.table, b);
                const mastery = state.facts[key]?.mastery ?? 'unseen';
                return (
                  <td key={b} data-testid={`fact-${key}`} className={`mastery-${mastery}`}>
                    {mastery[0].toUpperCase()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={handleExport}>
        Export progress
      </button>
      <button type="button" onClick={handleImportClick}>
        Import progress
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="import-file-input"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- ParentCorner`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/ParentCorner.tsx src/screens/ParentCorner.test.tsx
git commit -m "feat: add ParentCorner mastery heatmap with export/import"
```

---

### Task 14: App shell wiring and deploy documentation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `AppStateProvider` from `./store/AppStateContext`; `JourneyMap` from `./screens/JourneyMap`; `DrillScreen` from `./screens/DrillScreen`; `SessionResults` from `./screens/SessionResults`; `ParentCorner` from `./screens/ParentCorner`; `SessionSummary` from `./storage/schema`
- Produces: final `App` component wiring all four screens through a single state machine.

- [ ] **Step 1: Write the failing test for screen navigation**

Replace `src/App.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the journey map showing the first zone', () => {
    render(<App />);
    expect(screen.getByText('Sunlit Reef (2s)')).toBeInTheDocument();
  });

  it('navigates to the drill screen when Play is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('Play'));
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('navigates to the parent corner when the gear icon is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(screen.getByTestId('mastery-heatmap')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- App.test`
Expected: FAIL — `App` still renders only the placeholder heading from Task 1.

- [ ] **Step 3: Implement the App shell**

Replace `src/App.tsx`:
```tsx
import { useState } from 'react';
import { AppStateProvider } from './store/AppStateContext';
import { JourneyMap } from './screens/JourneyMap';
import { DrillScreen } from './screens/DrillScreen';
import { SessionResults } from './screens/SessionResults';
import { ParentCorner } from './screens/ParentCorner';
import { SessionSummary } from './storage/schema';

type Screen =
  | { name: 'map' }
  | { name: 'drill'; table: number }
  | { name: 'results'; summary: SessionSummary }
  | { name: 'parent' };

function AppShell() {
  const [screen, setScreen] = useState<Screen>({ name: 'map' });

  switch (screen.name) {
    case 'map':
      return (
        <JourneyMap
          onPlay={table => setScreen({ name: 'drill', table })}
          onOpenParentCorner={() => setScreen({ name: 'parent' })}
        />
      );
    case 'drill':
      return (
        <DrillScreen
          key={screen.table}
          table={screen.table}
          onComplete={summary => setScreen({ name: 'results', summary })}
        />
      );
    case 'results':
      return (
        <SessionResults
          summary={screen.summary}
          onPlayAgain={() => setScreen({ name: 'drill', table: screen.summary.table })}
          onHome={() => setScreen({ name: 'map' })}
        />
      );
    case 'parent':
      return <ParentCorner onBack={() => setScreen({ name: 'map' })} />;
  }
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- App.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all test files across `src/engine`, `src/storage`, `src/components`, `src/store`, `src/screens`, and `src/App.test.tsx` PASS.

- [ ] **Step 6: Verify the production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Add deploy instructions to the README**

Replace `README.md`:
```markdown
# Ocean Math Quest

A times-table flashcard game for practicing multiplication (2× through 12×), themed as an ocean dive. Mastery-gated progression, no ads, no accounts — all progress is saved locally in the browser.

## Develop

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

Produces a static site in `dist/`.

## Deploy

The build output in `dist/` is a fully static site (relative asset paths, no server needed). Two easy options:

- **Netlify:** drag the `dist/` folder onto https://app.netlify.com/drop
- **GitHub Pages:** push `dist/` to a `gh-pages` branch, or serve it from the repo's Pages settings pointed at `dist/`

To preview the production build locally first:
```bash
npm run build
npx serve dist
```

## Progress data

All progress lives in the browser's `localStorage`, scoped to this site's origin. Use the gear icon (Parent Corner) to export or import progress as a JSON file — handy for moving progress to a new device or backing it up before clearing browser data.
```

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/App.test.tsx README.md
git commit -m "feat: wire App shell across all screens; add deploy docs"
```
