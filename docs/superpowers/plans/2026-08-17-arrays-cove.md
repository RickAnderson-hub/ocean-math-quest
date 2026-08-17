# Arrays Cove Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new gated "Arrays Cove" zone-0 to Ocean Math Quest that teaches multiplication concepts (arrays, commutative/associative properties, equivalent facts, true/false judgment, when-to-multiply reasoning) via 8 mini-games, before the existing table-drilling zones unlock.

**Architecture:** Follows the existing app's layering exactly: pure-function engine modules (`src/engine/coveEngine.ts`, `src/engine/coveContent.ts`) carry all mastery/round-generation logic and get the unit-test load; presentational components (`ArrayGrid`, `WordProblemPicker`, `TrueFalseCard`, `GroupingBoard`) are dumb and reusable; a `CoveScreen` wires engine + components together the same way `DrillScreen` does today; `AppStateContext` gains one new mutator; `JourneyMap`/`ParentCorner`/`App.tsx` get minimal, additive changes.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + Testing Library (existing stack, no new dependencies).

**Spec:** `docs/superpowers/specs/2026-08-17-arrays-cove-design.md`

## Global Constraints

- `STORAGE_KEY` stays `'ocean-math-quest:v1'` — do **not** rename it when `SCHEMA_VERSION` bumps to 2. Renaming it orphans every existing player's saved progress (localStorage key changes = fresh empty state).
- Number range for all Cove content is 1–10 per factor (per spec), not the drilling zones' 2–12.
- No timer/speed pressure anywhere in the Cove (concept work, not fluency drilling) — no `performance.now()` timing, no recall-speed thresholds.
- Do not modify `masteryEngine.ts`, `queueBuilder.ts`, or any fluency mastery threshold for tables 2–12 (spec's explicit out-of-scope).
- A skill masters after 5 consecutive correct answers (`CONCEPT_MASTERY_STREAK = 5`), no multi-day requirement.
- Migration: an existing save (has any `facts` entries) gets `coveGateExempt: true` and `coveSkills` all **unmastered** — it must NOT mark the Cove complete. See spec's 2026-08-17 amendment.

## Deviations from the spec (flagging for review, not hidden)

1. **`CoveSessionResults` is a new component, not literal reuse of `SessionResults`.** `SessionResults` is typed specifically around the drill `SessionSummary` (which has a `table: number` and per-fact wording). Rather than widen that component's prop type and risk regressing its existing tests, `CoveSessionResults` is a small sibling component that reuses `SessionResults.css` for identical visuals. Net effect matches the spec's intent ("reused, with Cove-specific copy") without touching tested code.
2. **`ArrayGrid` uses +/− stepper buttons to change rows/cols, not free-form tap-to-build-cell-by-cell.** Steppers are far more testable (a click has one unambiguous effect) and are just as tap-driven for a 9-year-old.
3. **"Spin to Commute" is a multiple-choice question about the rotated array's dimensions, not a literal interactive rotate button.** An actual rotate button on a symmetric-looking display can't validate whether the child understood anything (the pre-rotation state already satisfies "either orientation"); asking them to predict the rotated dimensions actually checks the concept.
4. **"Commute & Solve" is a 3-option multiple choice (both correct orientations + one wrong product), not open array-building.** Keeps the round self-checking without new free-form input machinery, and still requires recognizing both `a×b` and `b×a` as correct.
5. **Associative property is checked as "compute the one shared total," not as two separately-graded bracketings.** Both bracketings always produce the same number — the pedagogical content ("grouping doesn't change the answer") is fully carried by showing both expressions and asking for the one number.

---

## File Structure

**New files:**
- `src/engine/coveEngine.ts` + `.test.ts` — skill IDs, mastery streak logic, cove/table-zone gating, round-queue builder
- `src/engine/coveContent.ts` + `.test.ts` — round generators + answer checkers for all 8 mini-games
- `src/components/ArrayGrid.tsx` + `.css` + `.test.tsx`
- `src/components/WordProblemPicker.tsx` + `.css` + `.test.tsx`
- `src/components/TrueFalseCard.tsx` + `.css` + `.test.tsx`
- `src/components/GroupingBoard.tsx` + `.css` + `.test.tsx`
- `src/screens/CoveGames.tsx` + `.test.tsx` — 8 mini-game wrapper components
- `src/screens/CoveScreen.tsx` + `.css` + `.test.tsx`
- `src/screens/CoveSessionResults.tsx` + `.test.tsx`

**Modified files:**
- `src/engine/types.ts` — add `ConceptSkillId`, `ConceptSkillState`
- `src/storage/schema.ts` — add `coveSkills`, `coveGateExempt`, `CoveSessionSummary`, bump `SCHEMA_VERSION`
- `src/storage/persistence.ts` — v1→v2 migration
- `src/storage/persistence.test.ts` — update version assertion, add migration tests
- `src/store/AppStateContext.tsx` — add `recordCoveSkillAttempt`
- `src/store/AppStateContext.test.tsx` — test the new mutator
- `src/screens/JourneyMap.tsx` + `.test.tsx` — Cove pin, table-zone gating
- `src/screens/ParentCorner.tsx` + `.test.tsx` — Cove skill progress panel
- `src/App.tsx` + `.test.tsx` — route `cove` / `cove-results` screens

---

### Task 1: Concept skill data model & mastery engine

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/coveEngine.ts`
- Test: `src/engine/coveEngine.test.ts`

**Interfaces:**
- Produces: `ConceptSkillId` (union type), `ConceptSkillState { recentCorrect: boolean[]; mastered: boolean }`, `CONCEPT_SKILL_IDS: ConceptSkillId[]`, `CONCEPT_MASTERY_STREAK = 5`, `COVE_SESSION_SIZE = 10`, `createDefaultCoveSkills(): Record<ConceptSkillId, ConceptSkillState>`, `recordSkillAttempt(state: ConceptSkillState, correct: boolean): ConceptSkillState`, `isCoveMastered(coveSkills): boolean`, `isTableZonesUnlocked(coveSkills, coveGateExempt: boolean): boolean`, `buildCoveQueue(coveSkills, size?: number): ConceptSkillId[]`.

- [ ] **Step 1: Add types to `src/engine/types.ts`**

Append to the existing file:

```ts
export type ConceptSkillId =
  | 'when-to-multiply'
  | 'build-array'
  | 'commute-spin'
  | 'commute-solve'
  | 'equivalent-facts'
  | 'true-false'
  | 'associative'
  | 'factor-pairs';

export interface ConceptSkillState {
  recentCorrect: boolean[];
  mastered: boolean;
}
```

- [ ] **Step 2: Write the failing tests for `coveEngine.ts`**

Create `src/engine/coveEngine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  CONCEPT_SKILL_IDS,
  buildCoveQueue,
  createDefaultCoveSkills,
  isCoveMastered,
  isTableZonesUnlocked,
  recordSkillAttempt,
} from './coveEngine';
import { ConceptSkillState } from './types';

describe('createDefaultCoveSkills', () => {
  it('creates all 8 skills, unmastered with empty history', () => {
    const skills = createDefaultCoveSkills();
    expect(Object.keys(skills).sort()).toEqual([...CONCEPT_SKILL_IDS].sort());
    for (const id of CONCEPT_SKILL_IDS) {
      expect(skills[id]).toEqual({ recentCorrect: [], mastered: false });
    }
  });
});

describe('recordSkillAttempt', () => {
  function state(recentCorrect: boolean[]): ConceptSkillState {
    return { recentCorrect, mastered: false };
  }

  it('is not mastered before 5 consecutive correct answers', () => {
    let s = state([]);
    for (let i = 0; i < 4; i++) {
      s = recordSkillAttempt(s, true);
    }
    expect(s.mastered).toBe(false);
    expect(s.recentCorrect).toEqual([true, true, true, true]);
  });

  it('masters on the 5th consecutive correct answer', () => {
    let s = state([]);
    for (let i = 0; i < 5; i++) {
      s = recordSkillAttempt(s, true);
    }
    expect(s.mastered).toBe(true);
  });

  it('a wrong answer resets the streak', () => {
    let s = state([true, true, true, true]);
    s = recordSkillAttempt(s, false);
    expect(s.mastered).toBe(false);
    s = recordSkillAttempt(s, true);
    expect(s.mastered).toBe(false);
  });

  it('caps history length at 20', () => {
    let s = state([]);
    for (let i = 0; i < 25; i++) {
      s = recordSkillAttempt(s, true);
    }
    expect(s.recentCorrect).toHaveLength(20);
    expect(s.mastered).toBe(true);
  });
});

describe('isCoveMastered', () => {
  it('is false when any skill is unmastered', () => {
    const skills = createDefaultCoveSkills();
    expect(isCoveMastered(skills)).toBe(false);
  });

  it('is true only when every skill is mastered', () => {
    const skills = createDefaultCoveSkills();
    for (const id of CONCEPT_SKILL_IDS) {
      skills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
    }
    expect(isCoveMastered(skills)).toBe(true);
  });
});

describe('isTableZonesUnlocked', () => {
  it('is false for a fresh save with an unmastered cove and no exemption', () => {
    expect(isTableZonesUnlocked(createDefaultCoveSkills(), false)).toBe(false);
  });

  it('is true when coveGateExempt is set, even with an unmastered cove', () => {
    expect(isTableZonesUnlocked(createDefaultCoveSkills(), true)).toBe(true);
  });

  it('is true once the cove is mastered, regardless of exemption', () => {
    const skills = createDefaultCoveSkills();
    for (const id of CONCEPT_SKILL_IDS) {
      skills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
    }
    expect(isTableZonesUnlocked(skills, false)).toBe(true);
  });
});

describe('buildCoveQueue', () => {
  it('returns a queue of the requested size, round-robin over unmastered skills', () => {
    const skills = createDefaultCoveSkills();
    const queue = buildCoveQueue(skills, 10);
    expect(queue).toHaveLength(10);
    expect(queue.slice(0, 8)).toEqual(CONCEPT_SKILL_IDS);
    expect(queue[8]).toBe(CONCEPT_SKILL_IDS[0]);
  });

  it('skips mastered skills', () => {
    const skills = createDefaultCoveSkills();
    skills['when-to-multiply'] = { recentCorrect: [true, true, true, true, true], mastered: true };
    const queue = buildCoveQueue(skills, 7);
    expect(queue).not.toContain('when-to-multiply');
    expect(queue).toHaveLength(7);
  });

  it('falls back to round-robin over all skills if every skill is mastered', () => {
    const skills = createDefaultCoveSkills();
    for (const id of CONCEPT_SKILL_IDS) {
      skills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
    }
    const queue = buildCoveQueue(skills, 3);
    expect(queue).toEqual([CONCEPT_SKILL_IDS[0], CONCEPT_SKILL_IDS[1], CONCEPT_SKILL_IDS[2]]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- coveEngine`
Expected: FAIL — `coveEngine.ts` does not exist yet.

- [ ] **Step 4: Implement `src/engine/coveEngine.ts`**

```ts
import { ConceptSkillId, ConceptSkillState } from './types';

export const CONCEPT_SKILL_IDS: ConceptSkillId[] = [
  'when-to-multiply',
  'build-array',
  'commute-spin',
  'commute-solve',
  'equivalent-facts',
  'true-false',
  'associative',
  'factor-pairs',
];

export const CONCEPT_MASTERY_STREAK = 5;
export const MAX_CONCEPT_ATTEMPTS_HISTORY = 20;
export const COVE_SESSION_SIZE = 10;

export function createDefaultCoveSkills(): Record<ConceptSkillId, ConceptSkillState> {
  const skills = {} as Record<ConceptSkillId, ConceptSkillState>;
  for (const id of CONCEPT_SKILL_IDS) {
    skills[id] = { recentCorrect: [], mastered: false };
  }
  return skills;
}

function computeConceptMastery(recentCorrect: boolean[]): boolean {
  if (recentCorrect.length < CONCEPT_MASTERY_STREAK) return false;
  return recentCorrect.slice(-CONCEPT_MASTERY_STREAK).every(Boolean);
}

export function recordSkillAttempt(skillState: ConceptSkillState, correct: boolean): ConceptSkillState {
  const recentCorrect = [...skillState.recentCorrect, correct].slice(-MAX_CONCEPT_ATTEMPTS_HISTORY);
  return { recentCorrect, mastered: computeConceptMastery(recentCorrect) };
}

export function isCoveMastered(coveSkills: Record<ConceptSkillId, ConceptSkillState>): boolean {
  return CONCEPT_SKILL_IDS.every(id => coveSkills[id]?.mastered === true);
}

export function isTableZonesUnlocked(
  coveSkills: Record<ConceptSkillId, ConceptSkillState>,
  coveGateExempt: boolean
): boolean {
  return coveGateExempt || isCoveMastered(coveSkills);
}

export function buildCoveQueue(
  coveSkills: Record<ConceptSkillId, ConceptSkillState>,
  size: number = COVE_SESSION_SIZE
): ConceptSkillId[] {
  const unmastered = CONCEPT_SKILL_IDS.filter(id => !coveSkills[id]?.mastered);
  const pool = unmastered.length > 0 ? unmastered : CONCEPT_SKILL_IDS;
  const queue: ConceptSkillId[] = [];
  for (let i = 0; i < size; i++) {
    queue.push(pool[i % pool.length]);
  }
  return queue;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- coveEngine`
Expected: PASS, all cases green.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/coveEngine.ts src/engine/coveEngine.test.ts
git commit -m "Add concept-skill mastery engine for Arrays Cove"
```

---

### Task 2: Schema, migration, and gate exemption

**Files:**
- Modify: `src/storage/schema.ts`
- Modify: `src/storage/persistence.ts`
- Modify: `src/storage/persistence.test.ts`

**Interfaces:**
- Consumes: `createDefaultCoveSkills` from `../engine/coveEngine` (Task 1); `ConceptSkillId`, `ConceptSkillState` from `../engine/types`.
- Produces: `SCHEMA_VERSION = 2`; `AppState.coveSkills`, `AppState.coveGateExempt`; `CoveSessionSummary` type.

- [ ] **Step 1: Update `src/storage/schema.ts`**

Replace the file's contents:

```ts
import { ConceptSkillId, ConceptSkillState, FactState } from '../engine/types';
import { createDefaultCoveSkills } from '../engine/coveEngine';

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'ocean-math-quest:v1'; // do not rename — this orphans existing saves

export interface SessionSummary {
  date: string;
  table: number;
  stars: 1 | 2 | 3;
  cardsCorrect: number;
  cardsTotal: number;
  newlyMastered: string[];
}

export interface CoveSessionSummary {
  date: string;
  stars: 1 | 2 | 3;
  cardsCorrect: number;
  cardsTotal: number;
  newlyMasteredSkills: ConceptSkillId[];
  coveMastered: boolean;
}

export interface AppState {
  version: number;
  profile: { name: string; muted: boolean };
  facts: Record<string, FactState>;
  coveSkills: Record<ConceptSkillId, ConceptSkillState>;
  coveGateExempt: boolean;
  sessions: SessionSummary[];
}

export function createDefaultState(): AppState {
  return {
    version: SCHEMA_VERSION,
    profile: { name: 'Explorer', muted: false },
    facts: {},
    coveSkills: createDefaultCoveSkills(),
    coveGateExempt: false,
    sessions: [],
  };
}
```

- [ ] **Step 2: Update the existing `loadState` version assertion in `persistence.test.ts`**

In `src/storage/persistence.test.ts`, change:

```ts
  it('loadState returns a default state when nothing is stored', () => {
    const state = loadState();
    expect(state.version).toBe(1);
    expect(state.facts).toEqual({});
    expect(state.sessions).toEqual([]);
  });
```

to:

```ts
  it('loadState returns a default state when nothing is stored', () => {
    const state = loadState();
    expect(state.version).toBe(2);
    expect(state.facts).toEqual({});
    expect(state.sessions).toEqual([]);
    expect(state.coveGateExempt).toBe(false);
  });
```

(Add the `SCHEMA_VERSION`/`CONCEPT_SKILL_IDS` import isn't required here — the literal `2` matches `schema.ts`'s new constant directly.)

- [ ] **Step 3: Add failing migration tests to `persistence.test.ts`**

Append inside the existing `describe('persistence', ...)` block:

```ts
  it('migrates a v1 save with existing fact progress: cove unmastered but gate-exempt', () => {
    const v1 = {
      version: 1,
      profile: { name: 'Explorer', muted: false },
      facts: { '2-3': { a: 2, b: 3, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' } },
      sessions: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));
    const state = loadState();
    expect(state.version).toBe(2);
    expect(state.coveGateExempt).toBe(true);
    expect(Object.values(state.coveSkills).every(s => s.mastered === false)).toBe(true);
    expect(state.facts['2-3'].mastery).toBe('mastered');
  });

  it('migrates a v1 save with no fact progress: cove unmastered, not gate-exempt', () => {
    const v1 = {
      version: 1,
      profile: { name: 'Explorer', muted: false },
      facts: {},
      sessions: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));
    const state = loadState();
    expect(state.coveGateExempt).toBe(false);
    expect(Object.values(state.coveSkills).every(s => s.mastered === false)).toBe(true);
  });

  it('defaults coveSkills and coveGateExempt when missing from an already-v2 save', () => {
    const v2 = {
      version: 2,
      profile: { name: 'Explorer', muted: false },
      facts: {},
      sessions: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
    const state = loadState();
    expect(state.coveGateExempt).toBe(false);
    expect(Object.values(state.coveSkills)).toHaveLength(8);
  });

  it('importStateJson accepts a v1 backup and migrates it', () => {
    const v1 = {
      version: 1,
      profile: { name: 'Explorer', muted: false },
      facts: { '4-4': { a: 4, b: 4, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' } },
      sessions: [],
    };
    const imported = importStateJson(JSON.stringify(v1));
    expect(imported.version).toBe(2);
    expect(imported.coveGateExempt).toBe(true);
    expect(imported.facts['4-4'].mastery).toBe('mastered');
  });
```

- [ ] **Step 4: Run tests to verify the new ones fail**

Run: `npm test -- persistence`
Expected: FAIL — `persistence.ts` doesn't handle v1→v2 migration yet, and `loadState().version` is still 1.

- [ ] **Step 5: Implement the migration in `src/storage/persistence.ts`**

Replace the file's contents:

```ts
import { AppState, createDefaultState, SCHEMA_VERSION, STORAGE_KEY } from './schema';
import { createDefaultCoveSkills } from '../engine/coveEngine';

interface V1AppState {
  version: 1;
  profile: { name: string; muted: boolean };
  facts?: AppState['facts'] | null;
  sessions?: AppState['sessions'] | null;
}

function migrateV1ToV2(v1: V1AppState): AppState {
  const facts = v1.facts ?? {};
  const hasExistingProgress = Object.keys(facts).length > 0;
  return {
    version: 2,
    profile: v1.profile,
    facts,
    coveSkills: createDefaultCoveSkills(),
    coveGateExempt: hasExistingProgress,
    sessions: v1.sessions ?? [],
  };
}

/**
 * Validates that a candidate object has a plausible AppState shape,
 * defaulting missing/null fields where safe and throwing on shapes that
 * are fundamentally wrong (e.g. facts is a string, not an object).
 */
function validateShape(candidate: AppState): AppState {
  const facts = (candidate as { facts?: unknown }).facts;
  if (facts !== undefined && facts !== null && (typeof facts !== 'object' || Array.isArray(facts))) {
    throw new Error('Cannot import: "facts" has an invalid shape');
  }
  const sessions = (candidate as { sessions?: unknown }).sessions;
  if (sessions !== undefined && sessions !== null && !Array.isArray(sessions)) {
    throw new Error('Cannot import: "sessions" has an invalid shape');
  }
  const coveSkills = (candidate as { coveSkills?: unknown }).coveSkills;
  if (coveSkills !== undefined && coveSkills !== null && (typeof coveSkills !== 'object' || Array.isArray(coveSkills))) {
    throw new Error('Cannot import: "coveSkills" has an invalid shape');
  }
  return {
    ...candidate,
    facts: (facts as AppState['facts']) ?? {},
    sessions: (sessions as AppState['sessions']) ?? [],
    coveSkills: (coveSkills as AppState['coveSkills']) ?? createDefaultCoveSkills(),
    coveGateExempt: typeof candidate.coveGateExempt === 'boolean' ? candidate.coveGateExempt : false,
  };
}

/**
 * Lenient migration path used for ordinary app startup from localStorage.
 * Corrupted or incompatible browser storage should never block the app —
 * it silently falls back to a safe default state.
 */
export function migrateState(parsed: unknown): AppState {
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { version?: unknown }).version !== 'number'
  ) {
    return createDefaultState();
  }
  let candidate = parsed as V1AppState | AppState;
  if (candidate.version === 1) {
    candidate = migrateV1ToV2(candidate as V1AppState);
  }
  if (candidate.version === SCHEMA_VERSION) {
    return validateShape(candidate as AppState);
  }
  return createDefaultState();
}

/**
 * Strict migration path used for explicit, user-initiated imports (e.g.
 * restoring a backup file). Unlike migrateState, it never silently
 * substitutes a default state for unrecognized/invalid data — doing so
 * on an explicit import would silently wipe the user's current progress
 * via the store's autosave effect. Instead it throws so the caller can
 * surface the failure and leave the current state untouched.
 */
export function migrateStateStrict(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Cannot import: data is not a valid progress file');
  }
  const version = (parsed as { version?: unknown }).version;
  if (typeof version !== 'number') {
    throw new Error('Cannot import: missing or invalid version field');
  }
  if (version !== 1 && version !== SCHEMA_VERSION) {
    throw new Error(`Cannot import: unrecognized data version (${version})`);
  }
  let candidate = parsed as V1AppState | AppState;
  if (version === 1) {
    candidate = migrateV1ToV2(candidate as V1AppState);
  }
  return validateShape(candidate as AppState);
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
  return migrateStateStrict(JSON.parse(json));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- persistence`
Expected: PASS, all cases including the new migration tests.

- [ ] **Step 7: Commit**

```bash
git add src/storage/schema.ts src/storage/persistence.ts src/storage/persistence.test.ts
git commit -m "Add coveSkills/coveGateExempt with v1-to-v2 save migration"
```

---

### Task 3: `AppStateContext.recordCoveSkillAttempt`

**Files:**
- Modify: `src/store/AppStateContext.tsx`
- Modify: `src/store/AppStateContext.test.tsx`

**Interfaces:**
- Consumes: `recordSkillAttempt` from `../engine/coveEngine` (Task 1); `ConceptSkillId` from `../engine/types`.
- Produces: `recordCoveSkillAttempt(skillId: ConceptSkillId, correct: boolean): void` on the context value.

- [ ] **Step 1: Read the existing context test file to match its setup pattern**

Run: `cat src/store/AppStateContext.test.tsx` and follow its existing render/wrapper conventions exactly (it already wraps a test component in `AppStateProvider`).

- [ ] **Step 2: Add a failing test**

Append a test to `src/store/AppStateContext.test.tsx` (following the file's existing pattern for calling a context mutator and re-reading `state`):

```tsx
  it('recordCoveSkillAttempt updates the named skill and leaves others untouched', () => {
    const { result } = renderAppState(); // use this file's existing render helper/pattern
    act(() => {
      result.current.recordCoveSkillAttempt('when-to-multiply', true);
    });
    expect(result.current.state.coveSkills['when-to-multiply'].recentCorrect).toEqual([true]);
    expect(result.current.state.coveSkills['build-array'].recentCorrect).toEqual([]);
  });
```

(Match whatever render/hook-access helper the existing tests in this file already use — e.g. `renderHook` with a wrapper, or a small test component. Do not introduce a second pattern.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- AppStateContext`
Expected: FAIL — `recordCoveSkillAttempt` does not exist on the context value.

- [ ] **Step 4: Implement in `src/store/AppStateContext.tsx`**

```ts
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, SessionSummary } from '../storage/schema';
import { exportStateJson, importStateJson, loadState, saveState } from '../storage/persistence';
import { recordAttempt } from '../engine/masteryEngine';
import { recordSkillAttempt } from '../engine/coveEngine';
import { factKeyFor } from '../engine/zones';
import { Attempt, ConceptSkillId, FactState } from '../engine/types';

interface AppStateContextValue {
  state: AppState;
  recordFactAttempt: (a: number, b: number, attempt: Attempt) => void;
  recordCoveSkillAttempt: (skillId: ConceptSkillId, correct: boolean) => void;
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

  function recordCoveSkillAttempt(skillId: ConceptSkillId, correct: boolean) {
    setState(prev => {
      const updated = recordSkillAttempt(prev.coveSkills[skillId], correct);
      return { ...prev, coveSkills: { ...prev.coveSkills, [skillId]: updated } };
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
    <AppStateContext.Provider
      value={{ state, recordFactAttempt, recordCoveSkillAttempt, addSession, exportState, importState }}
    >
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

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- AppStateContext`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/AppStateContext.tsx src/store/AppStateContext.test.tsx
git commit -m "Add recordCoveSkillAttempt to AppStateContext"
```

---

### Task 4: Round content generators and checkers

**Files:**
- Create: `src/engine/coveContent.ts`
- Test: `src/engine/coveContent.test.ts`

**Interfaces:**
- Consumes: `ConceptSkillId` from `./types`.
- Produces: round types (`WhenToMultiplyRound`, `BuildArrayRound`, `CommuteSpinRound`, `CommuteSolveRound`, `EquivalentFactsRound`, `TrueFalseRound`, `AssociativeRound`, `FactorPairsRound`), the `CoveRound` union, `generateRound(skillId, rng?): CoveRound`, and checkers `checkWhenToMultiply`, `checkBuildArray`, `checkCommuteSolve`, `checkEquivalentFacts`, `checkTrueFalse`, `checkAssociative`, `checkFactorPairs`. (`commute-spin` has no checker — its round is graded inline as a 2-option pick in Task 6, see Deviation 3.)

- [ ] **Step 1: Write the failing tests**

Create `src/engine/coveContent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  checkAssociative,
  checkBuildArray,
  checkCommuteSolve,
  checkEquivalentFacts,
  checkFactorPairs,
  checkTrueFalse,
  checkWhenToMultiply,
  generateRound,
} from './coveContent';
import {
  AssociativeRound,
  BuildArrayRound,
  CommuteSolveRound,
  EquivalentFactsRound,
  FactorPairsRound,
  TrueFalseRound,
  WhenToMultiplyRound,
} from './coveContent';

function fixedRng(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('generateRound', () => {
  it('generates a when-to-multiply round with factors in 2..10 and a valid correctChoice', () => {
    const round = generateRound('when-to-multiply', fixedRng(0.4, 0.9, 0.1)) as WhenToMultiplyRound;
    expect(round.skillId).toBe('when-to-multiply');
    expect(['multiply', 'add']).toContain(round.correctChoice);
    expect(round.multiplyExpression).toMatch(/^\d+ × \d+$/);
  });

  it('generates a build-array round whose target is a product of two 2..10 factors', () => {
    const round = generateRound('build-array', fixedRng(0.5, 0.5)) as BuildArrayRound;
    expect(round.skillId).toBe('build-array');
    expect(round.targetProduct).toBeGreaterThanOrEqual(4);
    expect(round.targetProduct).toBeLessThanOrEqual(100);
  });

  it('generates a commute-spin round with two distinct factors', () => {
    const round = generateRound('commute-spin', fixedRng(0.99, 0.99)) as { a: number; b: number };
    expect(round.a).not.toBe(round.b);
  });

  it('generates a commute-solve round with two options sharing the correct product', () => {
    const round = generateRound('commute-solve', fixedRng(0.2, 0.6, 0.3)) as CommuteSolveRound;
    expect(round.optionA.product).toBe(round.correctProduct);
    expect(round.optionB.product).toBe(round.correctProduct);
    expect(round.optionC.product).not.toBe(round.correctProduct);
  });

  it('generates an equivalent-facts round with a genuine alternate factor pair', () => {
    const round = generateRound('equivalent-facts', fixedRng(0.1, 0.9)) as EquivalentFactsRound;
    expect(checkEquivalentFacts(round, round.a, round.b)).toBe(false); // same pair, not "different"
  });

  it('generates a true-false round', () => {
    const round = generateRound('true-false', fixedRng(0.3, 0.3, 0.9)) as TrueFalseRound;
    expect(typeof round.isTrue).toBe('boolean');
    if (round.isTrue) {
      expect(round.claimedProduct).toBe(round.a * round.b);
    } else {
      expect(round.claimedProduct).not.toBe(round.a * round.b);
    }
  });

  it('generates an associative round with three factors in 2..5', () => {
    const round = generateRound('associative', fixedRng(0.1, 0.5, 0.9)) as AssociativeRound;
    for (const factor of [round.x, round.y, round.z]) {
      expect(factor).toBeGreaterThanOrEqual(2);
      expect(factor).toBeLessThanOrEqual(5);
    }
  });

  it('generates a factor-pairs round where totalWheels is a multiple of wheelsPerCar', () => {
    const round = generateRound('factor-pairs', fixedRng(0.5, 0.5)) as FactorPairsRound;
    expect(round.totalWheels % round.wheelsPerCar).toBe(0);
  });
});

describe('checkWhenToMultiply', () => {
  it('is correct only when the choice matches correctChoice', () => {
    const round = { skillId: 'when-to-multiply' as const, prompt: '', multiplyExpression: '', addExpression: '', correctChoice: 'multiply' as const };
    expect(checkWhenToMultiply(round, 'multiply')).toBe(true);
    expect(checkWhenToMultiply(round, 'add')).toBe(false);
  });
});

describe('checkBuildArray', () => {
  it('is correct when rows*cols equals the target', () => {
    const round: BuildArrayRound = { skillId: 'build-array', targetProduct: 12 };
    expect(checkBuildArray(round, 3, 4)).toBe(true);
    expect(checkBuildArray(round, 4, 3)).toBe(true);
    expect(checkBuildArray(round, 5, 3)).toBe(false);
  });
});

describe('checkCommuteSolve', () => {
  it('is correct for either matching-product option and wrong for the distractor', () => {
    const round: CommuteSolveRound = {
      skillId: 'commute-solve',
      prompt: '',
      correctProduct: 12,
      optionA: { id: 'a', label: '', product: 12 },
      optionB: { id: 'b', label: '', product: 12 },
      optionC: { id: 'c', label: '', product: 15 },
    };
    expect(checkCommuteSolve(round, 'a')).toBe(true);
    expect(checkCommuteSolve(round, 'b')).toBe(true);
    expect(checkCommuteSolve(round, 'c')).toBe(false);
  });
});

describe('checkEquivalentFacts', () => {
  it('rejects the same pair (in either order) and out-of-range answers', () => {
    const round: EquivalentFactsRound = { skillId: 'equivalent-facts', a: 3, b: 4 };
    expect(checkEquivalentFacts(round, 3, 4)).toBe(false);
    expect(checkEquivalentFacts(round, 4, 3)).toBe(false);
    expect(checkEquivalentFacts(round, 0, 12)).toBe(false);
    expect(checkEquivalentFacts(round, 11, 2)).toBe(false);
  });

  it('accepts a genuinely different pair with the same product', () => {
    const round: EquivalentFactsRound = { skillId: 'equivalent-facts', a: 3, b: 4 };
    expect(checkEquivalentFacts(round, 2, 6)).toBe(true);
    expect(checkEquivalentFacts(round, 6, 2)).toBe(true);
  });

  it('rejects a pair with a different product', () => {
    const round: EquivalentFactsRound = { skillId: 'equivalent-facts', a: 3, b: 4 };
    expect(checkEquivalentFacts(round, 5, 3)).toBe(false);
  });
});

describe('checkTrueFalse', () => {
  it('is correct when the answer matches isTrue', () => {
    const round: TrueFalseRound = { skillId: 'true-false', a: 3, b: 4, claimedProduct: 12, isTrue: true };
    expect(checkTrueFalse(round, true)).toBe(true);
    expect(checkTrueFalse(round, false)).toBe(false);
  });
});

describe('checkAssociative', () => {
  it('is correct when the answer equals x*y*z', () => {
    const round: AssociativeRound = { skillId: 'associative', x: 2, y: 3, z: 4 };
    expect(checkAssociative(round, 24)).toBe(true);
    expect(checkAssociative(round, 23)).toBe(false);
  });
});

describe('checkFactorPairs', () => {
  it('is correct when answer*wheelsPerCar equals totalWheels', () => {
    const round: FactorPairsRound = { skillId: 'factor-pairs', prompt: '', totalWheels: 24, wheelsPerCar: 4 };
    expect(checkFactorPairs(round, 6)).toBe(true);
    expect(checkFactorPairs(round, 5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- coveContent`
Expected: FAIL — `coveContent.ts` does not exist yet.

- [ ] **Step 3: Implement `src/engine/coveContent.ts`**

```ts
import { ConceptSkillId } from './types';

export interface WhenToMultiplyRound {
  skillId: 'when-to-multiply';
  prompt: string;
  multiplyExpression: string;
  addExpression: string;
  correctChoice: 'multiply' | 'add';
}

export interface BuildArrayRound {
  skillId: 'build-array';
  targetProduct: number;
}

export interface CommuteSpinRound {
  skillId: 'commute-spin';
  a: number;
  b: number;
}

export interface CommuteSolveRound {
  skillId: 'commute-solve';
  prompt: string;
  correctProduct: number;
  optionA: { id: string; label: string; product: number };
  optionB: { id: string; label: string; product: number };
  optionC: { id: string; label: string; product: number };
}

export interface EquivalentFactsRound {
  skillId: 'equivalent-facts';
  a: number;
  b: number;
}

export interface TrueFalseRound {
  skillId: 'true-false';
  a: number;
  b: number;
  claimedProduct: number;
  isTrue: boolean;
}

export interface AssociativeRound {
  skillId: 'associative';
  x: number;
  y: number;
  z: number;
}

export interface FactorPairsRound {
  skillId: 'factor-pairs';
  prompt: string;
  totalWheels: number;
  wheelsPerCar: number;
}

export type CoveRound =
  | WhenToMultiplyRound
  | BuildArrayRound
  | CommuteSpinRound
  | CommuteSolveRound
  | EquivalentFactsRound
  | TrueFalseRound
  | AssociativeRound
  | FactorPairsRound;

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

const NOUNS = ['fish', 'shells', 'starfish', 'crates'];

function generateWhenToMultiply(rng: () => number): WhenToMultiplyRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  const asMultiply = rng() < 0.5;
  const noun = pick(NOUNS, rng);
  const prompt = asMultiply
    ? `There are ${a} baskets with ${b} ${noun} in each. How many ${noun} in all?`
    : `There are ${a} ${noun} in one tide pool, then ${b} more ${noun} are found nearby. How many ${noun} in all?`;
  return {
    skillId: 'when-to-multiply',
    prompt,
    multiplyExpression: `${a} × ${b}`,
    addExpression: `${a} + ${b}`,
    correctChoice: asMultiply ? 'multiply' : 'add',
  };
}

function generateBuildArray(rng: () => number): BuildArrayRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  return { skillId: 'build-array', targetProduct: a * b };
}

function generateCommuteSpin(rng: () => number): CommuteSpinRound {
  const a = randInt(2, 10, rng);
  let b = randInt(2, 10, rng);
  if (b === a) {
    b = a === 10 ? a - 1 : a + 1;
  }
  return { skillId: 'commute-spin', a, b };
}

function generateCommuteSolve(rng: () => number): CommuteSolveRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  const correctProduct = a * b;
  let wrongProduct = correctProduct + randInt(1, 5, rng);
  if (wrongProduct === correctProduct) wrongProduct += 1;
  const noun = pick(NOUNS, rng);
  const prompt = `${a} rows of ${noun}, ${b} in each row. How many ${noun} in all?`;
  return {
    skillId: 'commute-solve',
    prompt,
    correctProduct,
    optionA: { id: 'a', label: `${a} × ${b} = ${correctProduct}`, product: correctProduct },
    optionB: { id: 'b', label: `${b} × ${a} = ${correctProduct}`, product: correctProduct },
    optionC: { id: 'c', label: `${a} × ${b} = ${wrongProduct}`, product: wrongProduct },
  };
}

function findAlternateFactorPair(target: number, a: number, b: number): [number, number] | null {
  for (let c = 1; c <= 10; c++) {
    if (target % c !== 0) continue;
    const d = target / c;
    if (d < 1 || d > 10) continue;
    const sameAsShown = (c === a && d === b) || (c === b && d === a);
    if (!sameAsShown) return [c, d];
  }
  return null;
}

function generateEquivalentFacts(rng: () => number): EquivalentFactsRound {
  for (let attempt = 0; attempt < 20; attempt++) {
    const a = randInt(2, 6, rng);
    const b = randInt(2, 10, rng);
    if (findAlternateFactorPair(a * b, a, b)) {
      return { skillId: 'equivalent-facts', a, b };
    }
  }
  return { skillId: 'equivalent-facts', a: 2, b: 6 }; // 12 = 3×4, guaranteed alternate
}

function generateTrueFalse(rng: () => number): TrueFalseRound {
  const a = randInt(2, 10, rng);
  const b = randInt(2, 10, rng);
  const correctProduct = a * b;
  const isTrue = rng() < 0.5;
  if (isTrue) {
    return { skillId: 'true-false', a, b, claimedProduct: correctProduct, isTrue: true };
  }
  const delta = randInt(1, 5, rng);
  const claimedProduct =
    correctProduct - delta < 1 ? correctProduct + delta : correctProduct + (rng() < 0.5 ? -delta : delta);
  return { skillId: 'true-false', a, b, claimedProduct, isTrue: false };
}

function generateAssociative(rng: () => number): AssociativeRound {
  return {
    skillId: 'associative',
    x: randInt(2, 5, rng),
    y: randInt(2, 5, rng),
    z: randInt(2, 5, rng),
  };
}

function generateFactorPairs(rng: () => number): FactorPairsRound {
  const wheelsPerCar = randInt(2, 6, rng);
  const numCars = randInt(2, 10, rng);
  const totalWheels = wheelsPerCar * numCars;
  return {
    skillId: 'factor-pairs',
    prompt: `A toy workshop builds models with ${wheelsPerCar} wheels each. They have ${totalWheels} wheels. How many models can they build?`,
    totalWheels,
    wheelsPerCar,
  };
}

export function generateRound(skillId: ConceptSkillId, rng: () => number = Math.random): CoveRound {
  switch (skillId) {
    case 'when-to-multiply':
      return generateWhenToMultiply(rng);
    case 'build-array':
      return generateBuildArray(rng);
    case 'commute-spin':
      return generateCommuteSpin(rng);
    case 'commute-solve':
      return generateCommuteSolve(rng);
    case 'equivalent-facts':
      return generateEquivalentFacts(rng);
    case 'true-false':
      return generateTrueFalse(rng);
    case 'associative':
      return generateAssociative(rng);
    case 'factor-pairs':
      return generateFactorPairs(rng);
  }
}

export function checkWhenToMultiply(round: WhenToMultiplyRound, choice: 'multiply' | 'add'): boolean {
  return choice === round.correctChoice;
}

export function checkBuildArray(round: BuildArrayRound, rows: number, cols: number): boolean {
  return rows * cols === round.targetProduct;
}

export function checkCommuteSolve(round: CommuteSolveRound, optionId: string): boolean {
  const options = [round.optionA, round.optionB, round.optionC];
  const chosen = options.find(o => o.id === optionId);
  return chosen !== undefined && chosen.product === round.correctProduct;
}

export function checkEquivalentFacts(round: EquivalentFactsRound, c: number, d: number): boolean {
  if (c < 1 || c > 10 || d < 1 || d > 10) return false;
  const sameAsShown = (c === round.a && d === round.b) || (c === round.b && d === round.a);
  return !sameAsShown && c * d === round.a * round.b;
}

export function checkTrueFalse(round: TrueFalseRound, answer: boolean): boolean {
  return answer === round.isTrue;
}

export function checkAssociative(round: AssociativeRound, answer: number): boolean {
  return answer === round.x * round.y * round.z;
}

export function checkFactorPairs(round: FactorPairsRound, answer: number): boolean {
  return answer * round.wheelsPerCar === round.totalWheels;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- coveContent`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/coveContent.ts src/engine/coveContent.test.ts
git commit -m "Add round generators and answer checkers for all 8 cove mini-games"
```

---

### Task 5: `ArrayGrid` component

**Files:**
- Create: `src/components/ArrayGrid.tsx`
- Create: `src/components/ArrayGrid.css`
- Test: `src/components/ArrayGrid.test.tsx`

**Interfaces:**
- Produces: `ArrayGrid({ rows, cols, maxSize?, editable?, onRowsChange?, onColsChange?, showSentence? })`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ArrayGrid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrayGrid } from './ArrayGrid';

describe('ArrayGrid', () => {
  it('renders one row element per row, each containing `cols` dots', () => {
    render(<ArrayGrid rows={3} cols={4} />);
    expect(screen.getByTestId('array-grid-row-0').children).toHaveLength(4);
    expect(screen.getByTestId('array-grid-row-2').children).toHaveLength(4);
    expect(screen.queryByTestId('array-grid-row-3')).toBeNull();
  });

  it('shows the multiplication sentence by default', () => {
    render(<ArrayGrid rows={3} cols={4} />);
    expect(screen.getByTestId('array-grid-sentence')).toHaveTextContent('3 × 4 = 12');
  });

  it('hides the sentence when showSentence is false', () => {
    render(<ArrayGrid rows={3} cols={4} showSentence={false} />);
    expect(screen.queryByTestId('array-grid-sentence')).toBeNull();
  });

  it('has no stepper controls when not editable', () => {
    render(<ArrayGrid rows={2} cols={2} />);
    expect(screen.queryByTestId('array-grid-rows-control')).toBeNull();
  });

  it('calls onRowsChange/onColsChange from the steppers, clamped to [1, maxSize]', async () => {
    const onRowsChange = vi.fn();
    const onColsChange = vi.fn();
    render(
      <ArrayGrid rows={10} cols={1} editable maxSize={10} onRowsChange={onRowsChange} onColsChange={onColsChange} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'more rows' }));
    expect(onRowsChange).toHaveBeenCalledWith(10); // clamped, was already at maxSize
    await userEvent.click(screen.getByRole('button', { name: 'fewer columns' }));
    expect(onColsChange).toHaveBeenCalledWith(1); // clamped, was already at minimum
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ArrayGrid`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/components/ArrayGrid.css`**

```css
.array-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.array-grid__control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.array-grid__control button {
  font-size: 1.25rem;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
}

.array-grid__grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  background: rgba(0, 60, 90, 0.06);
  border-radius: 0.75rem;
}

.array-grid__row {
  display: flex;
  gap: 0.35rem;
}

.array-grid__dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: #1f7a99;
}

.array-grid__sentence {
  font-size: 1.1rem;
  font-weight: 600;
}
```

- [ ] **Step 4: Implement `src/components/ArrayGrid.tsx`**

```tsx
import './ArrayGrid.css';

interface ArrayGridProps {
  rows: number;
  cols: number;
  maxSize?: number;
  editable?: boolean;
  onRowsChange?: (rows: number) => void;
  onColsChange?: (cols: number) => void;
  showSentence?: boolean;
}

export function ArrayGrid({
  rows,
  cols,
  maxSize = 10,
  editable = false,
  onRowsChange,
  onColsChange,
  showSentence = true,
}: ArrayGridProps) {
  const rowIndices = Array.from({ length: rows }, (_, r) => r);
  const colIndices = Array.from({ length: cols }, (_, c) => c);

  return (
    <div className="array-grid">
      {editable && (
        <div className="array-grid__control" data-testid="array-grid-rows-control">
          <button type="button" onClick={() => onRowsChange?.(Math.max(1, rows - 1))} aria-label="fewer rows">
            −
          </button>
          <span>{rows} rows</span>
          <button type="button" onClick={() => onRowsChange?.(Math.min(maxSize, rows + 1))} aria-label="more rows">
            +
          </button>
        </div>
      )}
      <div className="array-grid__grid" data-testid="array-grid-dots">
        {rowIndices.map(r => (
          <div key={r} className="array-grid__row" data-testid={`array-grid-row-${r}`}>
            {colIndices.map(c => (
              <span key={c} className="array-grid__dot" />
            ))}
          </div>
        ))}
      </div>
      {editable && (
        <div className="array-grid__control" data-testid="array-grid-cols-control">
          <button type="button" onClick={() => onColsChange?.(Math.max(1, cols - 1))} aria-label="fewer columns">
            −
          </button>
          <span>{cols} columns</span>
          <button type="button" onClick={() => onColsChange?.(Math.min(maxSize, cols + 1))} aria-label="more columns">
            +
          </button>
        </div>
      )}
      {showSentence && (
        <p className="array-grid__sentence" data-testid="array-grid-sentence">
          {rows} × {cols} = {rows * cols}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- ArrayGrid`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ArrayGrid.tsx src/components/ArrayGrid.css src/components/ArrayGrid.test.tsx
git commit -m "Add ArrayGrid component"
```

---

### Task 6: `WordProblemPicker` component

**Files:**
- Create: `src/components/WordProblemPicker.tsx`
- Create: `src/components/WordProblemPicker.css`
- Test: `src/components/WordProblemPicker.test.tsx`

**Interfaces:**
- Produces: `WordProblemPickerOption { id: string; label: string }`, `WordProblemPicker({ prompt, options, onSelect, selectedId?, disabled? })`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/WordProblemPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordProblemPicker } from './WordProblemPicker';

describe('WordProblemPicker', () => {
  const options = [
    { id: 'multiply', label: '3 × 4' },
    { id: 'add', label: '3 + 4' },
  ];

  it('renders the prompt and one button per option', () => {
    render(<WordProblemPicker prompt="How many in all?" options={options} onSelect={vi.fn()} />);
    expect(screen.getByTestId('word-problem-prompt')).toHaveTextContent('How many in all?');
    expect(screen.getByTestId('word-problem-option-multiply')).toHaveTextContent('3 × 4');
    expect(screen.getByTestId('word-problem-option-add')).toHaveTextContent('3 + 4');
  });

  it('calls onSelect with the clicked option id', async () => {
    const onSelect = vi.fn();
    render(<WordProblemPicker prompt="p" options={options} onSelect={onSelect} />);
    await userEvent.click(screen.getByTestId('word-problem-option-add'));
    expect(onSelect).toHaveBeenCalledWith('add');
  });

  it('disables all options when disabled is true', () => {
    render(<WordProblemPicker prompt="p" options={options} onSelect={vi.fn()} disabled />);
    expect(screen.getByTestId('word-problem-option-multiply')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- WordProblemPicker`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/components/WordProblemPicker.css`**

```css
.word-problem-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.word-problem-picker__prompt {
  font-size: 1.1rem;
  text-align: center;
  max-width: 28rem;
}

.word-problem-picker__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.word-problem-picker__option {
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  font-size: 1.05rem;
}

.word-problem-picker__option--selected {
  outline: 3px solid #1f7a99;
}
```

- [ ] **Step 4: Implement `src/components/WordProblemPicker.tsx`**

```tsx
import './WordProblemPicker.css';

export interface WordProblemPickerOption {
  id: string;
  label: string;
}

interface WordProblemPickerProps {
  prompt: string;
  options: WordProblemPickerOption[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  disabled?: boolean;
}

export function WordProblemPicker({
  prompt,
  options,
  onSelect,
  selectedId = null,
  disabled = false,
}: WordProblemPickerProps) {
  return (
    <div className="word-problem-picker">
      <p className="word-problem-picker__prompt" data-testid="word-problem-prompt">
        {prompt}
      </p>
      <div className="word-problem-picker__options">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            className={`word-problem-picker__option ${
              selectedId === option.id ? 'word-problem-picker__option--selected' : ''
            }`}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            data-testid={`word-problem-option-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- WordProblemPicker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/WordProblemPicker.tsx src/components/WordProblemPicker.css src/components/WordProblemPicker.test.tsx
git commit -m "Add WordProblemPicker component"
```

---

### Task 7: `TrueFalseCard` and `GroupingBoard` components

**Files:**
- Create: `src/components/TrueFalseCard.tsx`, `src/components/TrueFalseCard.css`
- Create: `src/components/GroupingBoard.tsx`, `src/components/GroupingBoard.css`
- Test: `src/components/TrueFalseCard.test.tsx`, `src/components/GroupingBoard.test.tsx`

**Interfaces:**
- Produces: `TrueFalseCard({ statement, onAnswer, disabled? })`, `GroupingBoard({ x, y, z })`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/TrueFalseCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrueFalseCard } from './TrueFalseCard';

describe('TrueFalseCard', () => {
  it('renders the statement', () => {
    render(<TrueFalseCard statement="7 × 4 = 30" onAnswer={vi.fn()} />);
    expect(screen.getByTestId('true-false-statement')).toHaveTextContent('7 × 4 = 30');
  });

  it('calls onAnswer(true) and onAnswer(false) from the respective buttons', async () => {
    const onAnswer = vi.fn();
    render(<TrueFalseCard statement="s" onAnswer={onAnswer} />);
    await userEvent.click(screen.getByTestId('true-false-true'));
    expect(onAnswer).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByTestId('true-false-false'));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('disables both buttons when disabled is true', () => {
    render(<TrueFalseCard statement="s" onAnswer={vi.fn()} disabled />);
    expect(screen.getByTestId('true-false-true')).toBeDisabled();
    expect(screen.getByTestId('true-false-false')).toBeDisabled();
  });
});
```

Create `src/components/GroupingBoard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupingBoard } from './GroupingBoard';

describe('GroupingBoard', () => {
  it('renders both bracketings of x, y, z', () => {
    render(<GroupingBoard x={2} y={3} z={4} />);
    expect(screen.getByTestId('grouping-board-left')).toHaveTextContent('(2 × 3) × 4');
    expect(screen.getByTestId('grouping-board-right')).toHaveTextContent('2 × (3 × 4)');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- TrueFalseCard GroupingBoard`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement `src/components/TrueFalseCard.css`**

```css
.true-false-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.true-false-card__statement {
  font-size: 1.5rem;
  font-weight: 700;
}

.true-false-card__actions {
  display: flex;
  gap: 1rem;
}

.true-false-card__actions button {
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 1.1rem;
}
```

- [ ] **Step 4: Implement `src/components/TrueFalseCard.tsx`**

```tsx
import './TrueFalseCard.css';

interface TrueFalseCardProps {
  statement: string;
  onAnswer: (answer: boolean) => void;
  disabled?: boolean;
}

export function TrueFalseCard({ statement, onAnswer, disabled = false }: TrueFalseCardProps) {
  return (
    <div className="true-false-card">
      <p className="true-false-card__statement" data-testid="true-false-statement">
        {statement}
      </p>
      <div className="true-false-card__actions">
        <button type="button" disabled={disabled} onClick={() => onAnswer(true)} data-testid="true-false-true">
          True
        </button>
        <button type="button" disabled={disabled} onClick={() => onAnswer(false)} data-testid="true-false-false">
          False
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement `src/components/GroupingBoard.css`**

```css
.grouping-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.grouping-board__expression {
  font-size: 1.3rem;
  font-weight: 600;
}

.grouping-board__equals {
  font-size: 1.1rem;
  opacity: 0.7;
}
```

- [ ] **Step 6: Implement `src/components/GroupingBoard.tsx`**

```tsx
import './GroupingBoard.css';

interface GroupingBoardProps {
  x: number;
  y: number;
  z: number;
}

export function GroupingBoard({ x, y, z }: GroupingBoardProps) {
  return (
    <div className="grouping-board">
      <p className="grouping-board__expression" data-testid="grouping-board-left">
        ({x} × {y}) × {z}
      </p>
      <p className="grouping-board__equals">=</p>
      <p className="grouping-board__expression" data-testid="grouping-board-right">
        {x} × ({y} × {z})
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- TrueFalseCard GroupingBoard`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/TrueFalseCard.tsx src/components/TrueFalseCard.css src/components/TrueFalseCard.test.tsx \
        src/components/GroupingBoard.tsx src/components/GroupingBoard.css src/components/GroupingBoard.test.tsx
git commit -m "Add TrueFalseCard and GroupingBoard components"
```

---

### Task 8: Mini-game wrapper components (`CoveGames.tsx`)

**Files:**
- Create: `src/screens/CoveGames.tsx`
- Test: `src/screens/CoveGames.test.tsx`

**Interfaces:**
- Consumes: `ArrayGrid` (Task 5), `WordProblemPicker` (Task 6), `TrueFalseCard`/`GroupingBoard` (Task 7), `NumberPad` (existing), all round types + checkers from `../engine/coveContent` (Task 4).
- Produces: `WhenToMultiplyGame`, `BuildArrayGame`, `CommuteSpinGame`, `CommuteSolveGame`, `EquivalentFactsGame`, `TrueFalseGame`, `AssociativeGame`, `FactorPairsGame` — each `({ round, onSubmit, disabled? }) => JSX`, where `onSubmit: (correct: boolean) => void`.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/CoveGames.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AssociativeGame,
  BuildArrayGame,
  CommuteSolveGame,
  CommuteSpinGame,
  EquivalentFactsGame,
  FactorPairsGame,
  TrueFalseGame,
  WhenToMultiplyGame,
} from './CoveGames';

describe('WhenToMultiplyGame', () => {
  it('submits correct=true when the correctChoice option is picked', async () => {
    const onSubmit = vi.fn();
    const round = {
      skillId: 'when-to-multiply' as const,
      prompt: 'p',
      multiplyExpression: '3 × 4',
      addExpression: '3 + 4',
      correctChoice: 'multiply' as const,
    };
    render(<WhenToMultiplyGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('word-problem-option-multiply'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('BuildArrayGame', () => {
  it('submits correct=true only when the built array matches the target', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'build-array' as const, targetProduct: 2 };
    render(<BuildArrayGame round={round} onSubmit={onSubmit} />);
    // starts at 1x1; bump rows to 2 to reach 2x1=2
    await userEvent.click(screen.getByRole('button', { name: 'more rows' }));
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('CommuteSpinGame', () => {
  it('submits correct=true for the rotated-dimensions option', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'commute-spin' as const, a: 3, b: 5 };
    render(<CommuteSpinGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByText('5 rows × 3 columns'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('CommuteSolveGame', () => {
  it('submits correct=true for a matching-product option', async () => {
    const onSubmit = vi.fn();
    const round = {
      skillId: 'commute-solve' as const,
      prompt: 'p',
      correctProduct: 12,
      optionA: { id: 'a', label: '3 × 4 = 12', product: 12 },
      optionB: { id: 'b', label: '4 × 3 = 12', product: 12 },
      optionC: { id: 'c', label: '3 × 4 = 15', product: 15 },
    };
    render(<CommuteSolveGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('word-problem-option-b'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('EquivalentFactsGame', () => {
  it('submits correct=true when a genuinely different equal-product array is built', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'equivalent-facts' as const, a: 3, b: 4 };
    render(<EquivalentFactsGame round={round} onSubmit={onSubmit} />);
    // second (editable) grid starts 1x1; build to 2x6 = 12
    const rowsMore = screen.getAllByRole('button', { name: 'more rows' })[0];
    for (let i = 0; i < 1; i++) await userEvent.click(rowsMore); // 1 -> 2 rows
    const colsMore = screen.getAllByRole('button', { name: 'more columns' })[0];
    for (let i = 0; i < 5; i++) await userEvent.click(colsMore); // 1 -> 6 cols
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('TrueFalseGame', () => {
  it('submits correct=true when the True/False answer matches isTrue', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'true-false' as const, a: 3, b: 4, claimedProduct: 12, isTrue: true };
    render(<TrueFalseGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('true-false-true'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('AssociativeGame', () => {
  it('submits correct=true when the typed total equals x*y*z', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'associative' as const, x: 2, y: 3, z: 4 };
    render(<AssociativeGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(onSubmit).toHaveBeenCalledWith(true); // "24"
  });
});

describe('FactorPairsGame', () => {
  it('submits correct=true when the typed answer matches numCars', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'factor-pairs' as const, prompt: 'p', totalWheels: 24, wheelsPerCar: 4 };
    render(<FactorPairsGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '6' }));
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- CoveGames`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/screens/CoveGames.tsx`**

```tsx
import { useState } from 'react';
import { ArrayGrid } from '../components/ArrayGrid';
import { WordProblemPicker } from '../components/WordProblemPicker';
import { TrueFalseCard } from '../components/TrueFalseCard';
import { GroupingBoard } from '../components/GroupingBoard';
import { NumberPad } from '../components/NumberPad';
import {
  AssociativeRound,
  BuildArrayRound,
  CommuteSolveRound,
  CommuteSpinRound,
  EquivalentFactsRound,
  FactorPairsRound,
  TrueFalseRound,
  WhenToMultiplyRound,
  checkAssociative,
  checkBuildArray,
  checkCommuteSolve,
  checkEquivalentFacts,
  checkFactorPairs,
  checkTrueFalse,
  checkWhenToMultiply,
} from '../engine/coveContent';

interface GameProps<T> {
  round: T;
  onSubmit: (correct: boolean) => void;
  disabled?: boolean;
}

export function WhenToMultiplyGame({ round, onSubmit, disabled }: GameProps<WhenToMultiplyRound>) {
  const options = [
    { id: 'multiply', label: round.multiplyExpression },
    { id: 'add', label: round.addExpression },
  ];
  return (
    <WordProblemPicker
      prompt={round.prompt}
      options={options}
      onSelect={id => onSubmit(checkWhenToMultiply(round, id as 'multiply' | 'add'))}
      disabled={disabled}
    />
  );
}

export function BuildArrayGame({ round, onSubmit, disabled }: GameProps<BuildArrayRound>) {
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">Build an array with {round.targetProduct} dots.</p>
      <ArrayGrid rows={rows} cols={cols} editable onRowsChange={setRows} onColsChange={setCols} />
      <button type="button" disabled={disabled} onClick={() => onSubmit(checkBuildArray(round, rows, cols))}>
        Check
      </button>
    </div>
  );
}

export function CommuteSpinGame({ round, onSubmit, disabled }: GameProps<CommuteSpinRound>) {
  const options = [
    { id: 'rotated', label: `${round.b} rows × ${round.a} columns` },
    { id: 'unrotated', label: `${round.a} rows × ${round.b} columns` },
  ];
  return (
    <div className="cove-game">
      <ArrayGrid rows={round.a} cols={round.b} />
      <WordProblemPicker
        prompt="If you spin this array a quarter turn, how many rows and columns will it have?"
        options={options}
        onSelect={id => onSubmit(id === 'rotated')}
        disabled={disabled}
      />
    </div>
  );
}

export function CommuteSolveGame({ round, onSubmit, disabled }: GameProps<CommuteSolveRound>) {
  const options = [
    { id: round.optionA.id, label: round.optionA.label },
    { id: round.optionB.id, label: round.optionB.label },
    { id: round.optionC.id, label: round.optionC.label },
  ];
  return (
    <WordProblemPicker
      prompt={round.prompt}
      options={options}
      onSelect={id => onSubmit(checkCommuteSolve(round, id))}
      disabled={disabled}
    />
  );
}

export function EquivalentFactsGame({ round, onSubmit, disabled }: GameProps<EquivalentFactsRound>) {
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">
        This array shows {round.a} × {round.b}. Build a different array with the same total.
      </p>
      <ArrayGrid rows={round.a} cols={round.b} />
      <ArrayGrid rows={rows} cols={cols} editable onRowsChange={setRows} onColsChange={setCols} />
      <button type="button" disabled={disabled} onClick={() => onSubmit(checkEquivalentFacts(round, rows, cols))}>
        Check
      </button>
    </div>
  );
}

export function TrueFalseGame({ round, onSubmit, disabled }: GameProps<TrueFalseRound>) {
  return (
    <TrueFalseCard
      statement={`${round.a} × ${round.b} = ${round.claimedProduct}`}
      onAnswer={answer => onSubmit(checkTrueFalse(round, answer))}
      disabled={disabled}
    />
  );
}

export function AssociativeGame({ round, onSubmit, disabled }: GameProps<AssociativeRound>) {
  const [value, setValue] = useState('');
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">Group them however you like — what's the total?</p>
      <GroupingBoard x={round.x} y={round.y} z={round.z} />
      <NumberPad
        value={value}
        onDigit={digit => setValue(v => v + digit)}
        onBackspace={() => setValue(v => v.slice(0, -1))}
        onSubmit={() => value !== '' && onSubmit(checkAssociative(round, Number(value)))}
        disabled={disabled}
      />
    </div>
  );
}

export function FactorPairsGame({ round, onSubmit, disabled }: GameProps<FactorPairsRound>) {
  const [value, setValue] = useState('');
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">{round.prompt}</p>
      <NumberPad
        value={value}
        onDigit={digit => setValue(v => v + digit)}
        onBackspace={() => setValue(v => v.slice(0, -1))}
        onSubmit={() => value !== '' && onSubmit(checkFactorPairs(round, Number(value)))}
        disabled={disabled}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- CoveGames`
Expected: PASS. (`BuildArrayGame`'s "Check" button and `AssociativeGame`'s NumberPad "submit" button already have accessible names from Task 5/existing `NumberPad`; add `aria-label="Check"` is not needed since the button's text content "Check" is its accessible name.)

- [ ] **Step 5: Commit**

```bash
git add src/screens/CoveGames.tsx src/screens/CoveGames.test.tsx
git commit -m "Add the 8 Arrays Cove mini-game wrapper components"
```

---

### Task 9: `CoveScreen`

**Files:**
- Create: `src/screens/CoveScreen.tsx`
- Create: `src/screens/CoveScreen.css`
- Test: `src/screens/CoveScreen.test.tsx`

**Interfaces:**
- Consumes: `useAppState` (Task 3), `buildCoveQueue`, `CONCEPT_SKILL_IDS` (Task 1), `generateRound`, `CoveRound` (Task 4), `recordSkillAttempt` (Task 1, for local newly-mastered detection), all 8 game components (Task 8), `CoveSessionSummary` (Task 2).
- Produces: `CoveScreen({ onComplete: (summary: CoveSessionSummary) => void, rng?: () => number })` — `rng` defaults to `Math.random` and exists purely for deterministic testing (mirrors `buildSessionQueue`'s `rng` param in `queueBuilder.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/screens/CoveScreen.test.tsx`. This seeds a **fully-mastered-except-one-skill** cove so `buildCoveQueue` falls back to round-robin over just `when-to-multiply`, making every round the same question type. `CoveScreen` takes an optional `rng` prop (mirroring `buildSessionQueue`'s existing `rng` parameter in `queueBuilder.ts`) so the test can force deterministic round content — without it, `generateRound`'s internal `Math.random()` makes `correctChoice` random per round, and a fixed "always click multiply" test couldn't assert exact correctness. Also follows this codebase's convention for feedback-delay screens (see `DrillScreen.test.tsx`): `vi.useFakeTimers()` + `fireEvent` + `act(() => vi.advanceTimersByTime(600))`, not `userEvent`/real-time `waitFor` — a real-time 10-round loop risks exceeding Vitest's default per-test timeout.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppStateProvider } from '../store/AppStateContext';
import { CoveScreen } from './CoveScreen';
import { saveState } from '../storage/persistence';
import { createDefaultState } from '../storage/schema';
import { CONCEPT_SKILL_IDS } from '../engine/coveEngine';

function seedAllMasteredExceptWhenToMultiply() {
  const state = createDefaultState();
  for (const id of CONCEPT_SKILL_IDS) {
    if (id === 'when-to-multiply') continue;
    state.coveSkills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
  }
  saveState(state);
}

// Constant low rng: generateWhenToMultiply's `asMultiply = rng() < 0.5` is always
// true, so correctChoice is always 'multiply' — makes every round's answer known.
const alwaysMultiplyRng = () => 0.1;

describe('CoveScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('runs a 10-round session, all correct, and calls onComplete with a full-marks summary', () => {
    seedAllMasteredExceptWhenToMultiply();
    const onComplete = vi.fn();
    render(
      <AppStateProvider>
        <CoveScreen onComplete={onComplete} rng={alwaysMultiplyRng} />
      </AppStateProvider>
    );

    for (let round = 0; round < 10; round++) {
      fireEvent.click(screen.getByTestId('word-problem-option-multiply'));
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary.cardsTotal).toBe(10);
    expect(summary.cardsCorrect).toBe(10);
    expect(summary.stars).toBe(3);
    expect(summary.newlyMasteredSkills).toEqual(['when-to-multiply']);
    expect(summary.coveMastered).toBe(true);
  });

  it('shows round progress as "N / 10"', () => {
    seedAllMasteredExceptWhenToMultiply();
    render(
      <AppStateProvider>
        <CoveScreen onComplete={vi.fn()} rng={alwaysMultiplyRng} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('cove-progress')).toHaveTextContent('1 / 10');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CoveScreen`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/screens/CoveScreen.css`**

```css
.cove-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
}

.cove-screen__header {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 32rem;
}

.cove-screen__card {
  width: 100%;
  max-width: 32rem;
  display: flex;
  justify-content: center;
}

.cove-screen__card.correct {
  outline: 3px solid #2fae5c;
}

.cove-screen__card.wrong {
  outline: 3px solid #d9534f;
}
```

- [ ] **Step 4: Implement `src/screens/CoveScreen.tsx`**

```tsx
import { useRef, useState } from 'react';
import { useAppState } from '../store/AppStateContext';
import { buildCoveQueue, CONCEPT_SKILL_IDS, recordSkillAttempt } from '../engine/coveEngine';
import { generateRound, CoveRound } from '../engine/coveContent';
import { ConceptSkillId } from '../engine/types';
import { CoveSessionSummary } from '../storage/schema';
import {
  AssociativeGame,
  BuildArrayGame,
  CommuteSolveGame,
  CommuteSpinGame,
  EquivalentFactsGame,
  FactorPairsGame,
  TrueFalseGame,
  WhenToMultiplyGame,
} from './CoveGames';
import './CoveScreen.css';

const FEEDBACK_DELAY_MS = 600;

interface CoveScreenProps {
  onComplete: (summary: CoveSessionSummary) => void;
  rng?: () => number;
}

export function CoveScreen({ onComplete, rng = Math.random }: CoveScreenProps) {
  const { state, recordCoveSkillAttempt } = useAppState();
  const [skillQueue] = useState<ConceptSkillId[]>(() => buildCoveQueue(state.coveSkills));
  const [rounds] = useState<CoveRound[]>(() => skillQueue.map(id => generateRound(id, rng)));
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const statsRef = useRef({ correct: 0, total: 0, newlyMastered: new Set<ConceptSkillId>() });

  const round = rounds[index];
  if (!round) {
    return null;
  }

  function handleSubmit(correct: boolean) {
    statsRef.current.total += 1;
    if (correct) statsRef.current.correct += 1;

    const previous = state.coveSkills[round.skillId];
    const updated = recordSkillAttempt(previous, correct);
    if (!previous.mastered && updated.mastered) {
      statsRef.current.newlyMastered.add(round.skillId);
    }
    recordCoveSkillAttempt(round.skillId, correct);

    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      const nextIndex = index + 1;
      if (nextIndex >= rounds.length) {
        finishSession();
      } else {
        setIndex(nextIndex);
      }
    }, FEEDBACK_DELAY_MS);
  }

  function finishSession() {
    const { correct, total, newlyMastered } = statsRef.current;
    const accuracy = total === 0 ? 0 : correct / total;
    const stars: 1 | 2 | 3 = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    const coveMastered = CONCEPT_SKILL_IDS.every(
      id => state.coveSkills[id].mastered || newlyMastered.has(id)
    );
    const summary: CoveSessionSummary = {
      date: new Date().toISOString().slice(0, 10),
      stars,
      cardsCorrect: correct,
      cardsTotal: total,
      newlyMasteredSkills: Array.from(newlyMastered),
      coveMastered,
    };
    onComplete(summary);
  }

  return (
    <div className="cove-screen">
      <div className="cove-screen__header">
        <span className="cove-screen__title">Arrays Cove</span>
        <div className="cove-screen__progress" data-testid="cove-progress">
          {index + 1} / {rounds.length}
        </div>
      </div>
      <div className={`cove-screen__card ${feedback ?? ''}`} data-testid="cove-card">
        {renderGame(round, handleSubmit, feedback !== null)}
      </div>
    </div>
  );
}

function renderGame(round: CoveRound, onSubmit: (correct: boolean) => void, disabled: boolean) {
  switch (round.skillId) {
    case 'when-to-multiply':
      return <WhenToMultiplyGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'build-array':
      return <BuildArrayGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'commute-spin':
      return <CommuteSpinGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'commute-solve':
      return <CommuteSolveGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'equivalent-facts':
      return <EquivalentFactsGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'true-false':
      return <TrueFalseGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'associative':
      return <AssociativeGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'factor-pairs':
      return <FactorPairsGame round={round} onSubmit={onSubmit} disabled={disabled} />;
  }
}
```

Note: `recordSkillAttempt` must be exported from `coveEngine.ts` (it already is, per Task 1).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- CoveScreen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/CoveScreen.tsx src/screens/CoveScreen.css src/screens/CoveScreen.test.tsx
git commit -m "Add CoveScreen wiring rounds, mastery tracking, and session summary"
```

---

### Task 10: `CoveSessionResults`

**Files:**
- Create: `src/screens/CoveSessionResults.tsx`
- Test: `src/screens/CoveSessionResults.test.tsx`

**Interfaces:**
- Consumes: `CoveSessionSummary` (Task 2); reuses `src/screens/SessionResults.css` (existing).
- Produces: `CoveSessionResults({ summary, onPlayAgain, onHome })`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/CoveSessionResults.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoveSessionResults } from './CoveSessionResults';
import { CoveSessionSummary } from '../storage/schema';

const baseSummary: CoveSessionSummary = {
  date: '2026-08-17',
  stars: 3,
  cardsCorrect: 9,
  cardsTotal: 10,
  newlyMasteredSkills: [],
  coveMastered: false,
};

describe('CoveSessionResults', () => {
  it('shows the score and star rating', () => {
    render(<CoveSessionResults summary={baseSummary} onPlayAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByTestId('score')).toHaveTextContent('9 / 10');
  });

  it('shows a newly-mastered message when skills were mastered this session', () => {
    render(
      <CoveSessionResults
        summary={{ ...baseSummary, newlyMasteredSkills: ['when-to-multiply'] }}
        onPlayAgain={vi.fn()}
        onHome={vi.fn()}
      />
    );
    expect(screen.getByTestId('newly-mastered')).toHaveTextContent('1 new skill mastered!');
  });

  it('shows the cove-mastered message when the cove was just completed', () => {
    render(
      <CoveSessionResults summary={{ ...baseSummary, coveMastered: true }} onPlayAgain={vi.fn()} onHome={vi.fn()} />
    );
    expect(screen.getByTestId('cove-mastered-message')).toHaveTextContent('You unlocked Sunlit Reef!');
  });

  it('calls onPlayAgain and onHome from their buttons', async () => {
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<CoveSessionResults summary={baseSummary} onPlayAgain={onPlayAgain} onHome={onHome} />);
    await userEvent.click(screen.getByText('Play again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText('Back to map'));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CoveSessionResults`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/screens/CoveSessionResults.tsx`**

```tsx
import { CoveSessionSummary } from '../storage/schema';
import './SessionResults.css';

interface CoveSessionResultsProps {
  summary: CoveSessionSummary;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function CoveSessionResults({ summary, onPlayAgain, onHome }: CoveSessionResultsProps) {
  return (
    <div className="session-results">
      <div className={`session-results__card session-results__card--stars-${summary.stars}`}>
        <h2 className="session-results__stars">{'⭐'.repeat(summary.stars)}</h2>
        <p className="session-results__score" data-testid="score">
          {summary.cardsCorrect} / {summary.cardsTotal}
        </p>
        {summary.newlyMasteredSkills.length > 0 && (
          <p className="session-results__mastered" data-testid="newly-mastered">
            {summary.newlyMasteredSkills.length} new skill{summary.newlyMasteredSkills.length === 1 ? '' : 's'} mastered!
          </p>
        )}
        {summary.coveMastered ? (
          <p className="session-results__zone" data-testid="cove-mastered-message">
            You unlocked Sunlit Reef!
          </p>
        ) : (
          <p className="session-results__zone">Arrays Cove</p>
        )}
        <div className="session-results__actions">
          <button
            type="button"
            className="session-results__button session-results__button--primary"
            onClick={onPlayAgain}
          >
            Play again
          </button>
          <button type="button" className="session-results__button" onClick={onHome}>
            Back to map
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CoveSessionResults`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CoveSessionResults.tsx src/screens/CoveSessionResults.test.tsx
git commit -m "Add CoveSessionResults screen"
```

---

### Task 11: `JourneyMap` — Cove pin and table-zone gating

**Files:**
- Modify: `src/screens/JourneyMap.tsx`
- Modify: `src/screens/JourneyMap.test.tsx`

**Interfaces:**
- Consumes: `isCoveMastered`, `isTableZonesUnlocked` from `../engine/coveEngine` (Task 1).
- Produces: `JourneyMap` gains an `onPlayCove: () => void` prop (in addition to its existing `onPlay`/`onOpenParentCorner`).

**Existing test file (`src/screens/JourneyMap.test.tsx`) asserts zone-2 has an immediate Play button — true today, false after this task: a fresh, non-exempt save now starts with every table zone locked behind the Cove.** Its first two tests must be updated to seed a gate-exempt save (simulating a save that predates the Cove) so their original intent — verifying table-zone Play/Locked/onPlay behavior — still holds. The third test needs the new required `onPlayCove` prop or the build fails typechecking.

- [ ] **Step 1: Replace `src/screens/JourneyMap.test.tsx` entirely with this content**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JourneyMap } from './JourneyMap';
import { AppStateProvider } from '../store/AppStateContext';
import { saveState } from '../storage/persistence';
import { createDefaultState } from '../storage/schema';

function seedGateExemptSave() {
  const state = createDefaultState();
  state.coveGateExempt = true;
  saveState(state);
}

describe('JourneyMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows a Play button for the current (first) table zone and Locked for later ones, on a gate-exempt save', () => {
    seedGateExemptSave();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(within(screen.getByTestId('zone-2')).getByText('Play')).toBeInTheDocument();
    expect(within(screen.getByTestId('zone-3')).getByText('Locked')).toBeInTheDocument();
  });

  it('calls onPlay with the table number when a table zone Play is clicked, on a gate-exempt save', async () => {
    seedGateExemptSave();
    const onPlay = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={onPlay} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    await userEvent.click(within(screen.getByTestId('zone-2')).getByText('Play'));
    expect(onPlay).toHaveBeenCalledWith(2);
  });

  it('calls onOpenParentCorner when the gear icon is clicked', async () => {
    const onOpenParentCorner = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={onOpenParentCorner} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(onOpenParentCorner).toHaveBeenCalledTimes(1);
  });

  it('renders an Arrays Cove pin and calls onPlayCove when its Play button is clicked', async () => {
    const onPlayCove = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={onPlayCove} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('zone-arrays-cove')).toBeInTheDocument();
    await userEvent.click(within(screen.getByTestId('zone-arrays-cove')).getByText('Play'));
    expect(onPlayCove).toHaveBeenCalledTimes(1);
  });

  it('locks every table zone when the cove is unmastered and the save is not gate-exempt', () => {
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('zone-2')).toHaveClass('dive-node--locked');
  });

  it('leaves table zones unlocked for a gate-exempt save even with an unmastered cove', () => {
    seedGateExemptSave();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('zone-2')).not.toHaveClass('dive-node--locked');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- JourneyMap`
Expected: FAIL — `onPlayCove` prop doesn't exist on `JourneyMapProps` yet, no Cove pin rendered, table zones aren't gated.

- [ ] **Step 3: Implement in `src/screens/JourneyMap.tsx`**

```tsx
import { currentUnlockedZone, isZoneMastered, ZONES } from '../engine/zones';
import { isCoveMastered, isTableZonesUnlocked } from '../engine/coveEngine';
import { useAppState } from '../store/AppStateContext';
import './JourneyMap.css';

interface JourneyMapProps {
  onPlay: (table: number) => void;
  onPlayCove: () => void;
  onOpenParentCorner: () => void;
}

export function JourneyMap({ onPlay, onPlayCove, onOpenParentCorner }: JourneyMapProps) {
  const { state } = useAppState();
  const coveMastered = isCoveMastered(state.coveSkills);
  const tableZonesUnlocked = isTableZonesUnlocked(state.coveSkills, state.coveGateExempt);
  const unlocked = currentUnlockedZone(state.facts);

  return (
    <div className="journey-map">
      <header className="journey-map__header">
        <h1 className="journey-map__title">Ocean Math Quest</h1>
        <button
          type="button"
          className="parent-corner-gear"
          aria-label="parent corner"
          onClick={onOpenParentCorner}
        >
          ⚙
        </button>
      </header>
      <ol className="dive-path">
        <li
          key="arrays-cove"
          data-testid="zone-arrays-cove"
          className={`dive-node dive-node--left dive-node--${coveMastered ? 'mastered' : 'current'}`}
        >
          <div className="dive-node__card">
            <span className="dive-node__label">Arrays Cove</span>
            {coveMastered && (
              <span data-testid="cove-badge" className="dive-node__creature">
                Toolkit unlocked!
              </span>
            )}
            <button type="button" className="dive-node__action" onClick={onPlayCove}>
              {coveMastered ? 'Replay' : 'Play'}
            </button>
          </div>
        </li>
        {ZONES.map((zone, i) => {
          const mastered = isZoneMastered(zone.table, state.facts);
          const isCurrent = tableZonesUnlocked && zone.table === unlocked;
          const isLocked = !tableZonesUnlocked || zone.table > unlocked;
          const side = (i + 1) % 2 === 0 ? 'left' : 'right';
          const status = isLocked ? 'locked' : isCurrent ? 'current' : 'mastered';

          return (
            <li
              key={zone.table}
              data-testid={`zone-${zone.table}`}
              className={`dive-node dive-node--${side} dive-node--${status}`}
              style={{ '--depth': zone.table } as React.CSSProperties}
            >
              <span className="dive-node__depth" aria-hidden="true">
                {zone.table}
              </span>
              <div className="dive-node__card">
                <span className="dive-node__label">
                  {zone.name} ({zone.table}s)
                </span>
                {mastered && (
                  <span data-testid={`creature-${zone.table}`} className="dive-node__creature">
                    {zone.creature}
                  </span>
                )}
                {!isLocked && (
                  <button type="button" className="dive-node__action" onClick={() => onPlay(zone.table)}>
                    {isCurrent ? 'Play' : 'Replay'}
                  </button>
                )}
                {isLocked && <span className="dive-node__lock">Locked</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- JourneyMap`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add src/screens/JourneyMap.tsx src/screens/JourneyMap.test.tsx
git commit -m "Add Arrays Cove pin to JourneyMap and gate table zones behind it"
```

---

### Task 12: `ParentCorner` — Cove skill progress panel

**Files:**
- Modify: `src/screens/ParentCorner.tsx`
- Modify: `src/screens/ParentCorner.test.tsx`

**Interfaces:**
- Consumes: `CONCEPT_SKILL_IDS` from `../engine/coveEngine`; `ConceptSkillId` from `../engine/types`.

- [ ] **Step 1: Add a failing test**

Append inside the existing `describe('ParentCorner', ...)` block in `src/screens/ParentCorner.test.tsx` (the file already imports `saveState`, `createDefaultState`, and `AppStateProvider` — no new imports needed):

```tsx
  it('shows a progress row for every cove skill', () => {
    render(
      <AppStateProvider>
        <ParentCorner onBack={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('cove-skill-when-to-multiply')).toHaveTextContent('In progress');
  });

  it('shows Mastered once a skill reaches the mastery streak', () => {
    const state = createDefaultState();
    state.coveSkills['when-to-multiply'] = { recentCorrect: [true, true, true, true, true], mastered: true };
    saveState(state);
    render(
      <AppStateProvider>
        <ParentCorner onBack={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('cove-skill-when-to-multiply')).toHaveTextContent('Mastered');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ParentCorner`
Expected: FAIL — no `cove-skill-*` test ids exist yet.

- [ ] **Step 3: Implement in `src/screens/ParentCorner.tsx`**

Add near the top of the file, after the existing imports:

```tsx
import { CONCEPT_SKILL_IDS } from '../engine/coveEngine';
import { ConceptSkillId } from '../engine/types';

const SKILL_LABELS: Record<ConceptSkillId, string> = {
  'when-to-multiply': 'When to Multiply',
  'build-array': 'Build an Array',
  'commute-spin': 'Spin to Commute',
  'commute-solve': 'Commute & Solve',
  'equivalent-facts': 'Equivalent Facts',
  'true-false': 'True or False',
  associative: 'Regroup the Crates',
  'factor-pairs': 'How Many Wheels?',
};
```

Then, inside the returned JSX, insert a new panel right after `parent-corner__hint` and before `parent-corner__table-wrap`:

```tsx
      <div className="parent-corner__cove-progress" data-testid="cove-progress-panel">
        <h2 className="parent-corner__subheading">Arrays Cove</h2>
        <ul className="parent-corner__cove-skill-list">
          {CONCEPT_SKILL_IDS.map(id => (
            <li
              key={id}
              data-testid={`cove-skill-${id}`}
              className={state.coveSkills[id].mastered ? 'cove-skill--mastered' : 'cove-skill--in-progress'}
            >
              {SKILL_LABELS[id]}: {state.coveSkills[id].mastered ? 'Mastered' : 'In progress'}
            </li>
          ))}
        </ul>
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ParentCorner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ParentCorner.tsx src/screens/ParentCorner.test.tsx
git commit -m "Show Arrays Cove skill progress in Parent Corner"
```

---

### Task 13: `App.tsx` — route the Cove screens

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `CoveScreen` (Task 9), `CoveSessionResults` (Task 10), `JourneyMap`'s new `onPlayCove` prop (Task 11), `CoveSessionSummary` (Task 2).

**Existing test file (`src/App.test.tsx`) has a test — "navigates to the drill screen when Play is clicked" — that clicks `screen.getByText('Play')` on a fresh save.** After this task, a fresh (non-exempt) save locks every table zone behind the Cove, so Sunlit Reef no longer shows a "Play" button at all on a fresh save (it shows "Locked"); that test's premise breaks. It must be updated to seed a gate-exempt save first, matching the same fix already applied to `JourneyMap.test.tsx` in Task 11.

- [ ] **Step 1: Replace `src/App.test.tsx` entirely with this content**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { saveState } from './storage/persistence';
import { createDefaultState } from './storage/schema';
import { CONCEPT_SKILL_IDS } from './engine/coveEngine';

function seedGateExemptSave() {
  const state = createDefaultState();
  state.coveGateExempt = true;
  saveState(state);
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the journey map showing the first zone', () => {
    render(<App />);
    expect(screen.getByText('Sunlit Reef (2s)')).toBeInTheDocument();
  });

  it('navigates to the drill screen when a table zone Play is clicked, on a gate-exempt save', async () => {
    seedGateExemptSave();
    render(<App />);
    await userEvent.click(within(screen.getByTestId('zone-2')).getByText('Play'));
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('navigates to the parent corner when the gear icon is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(screen.getByTestId('mastery-heatmap')).toBeInTheDocument();
  });

  it('navigates from the map into Arrays Cove, completes a session, and returns to the map', () => {
    vi.useFakeTimers();
    // Seed a save where every cove skill but one is already mastered, so a
    // 10-round session is a single repeated question type (mirrors the
    // seeding approach in CoveScreen.test.tsx from Task 9). App.tsx doesn't
    // expose CoveScreen's rng prop, so this relies on the default Math.random
    // — every round is 'when-to-multiply' regardless of its random
    // correctChoice, and this test doesn't assert on correctness, only on
    // screen transitions.
    const state = createDefaultState();
    for (const id of CONCEPT_SKILL_IDS) {
      if (id === 'when-to-multiply') continue;
      state.coveSkills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
    }
    saveState(state);

    render(<App />);
    fireEvent.click(within(screen.getByTestId('zone-arrays-cove')).getByText('Play'));
    expect(screen.getByTestId('cove-progress')).toBeInTheDocument();

    for (let round = 0; round < 10; round++) {
      fireEvent.click(screen.getByTestId('word-problem-option-multiply'));
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(screen.getByTestId('score')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back to map'));
    expect(screen.getByText('Sunlit Reef (2s)')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify the changed/new ones fail**

Run: `npm test -- App`
Expected: FAIL — `JourneyMap` isn't given an `onPlayCove` prop yet, no `cove` screen state exists, zone-2 isn't locked/unlocked based on `coveGateExempt` yet.

- [ ] **Step 3: Implement in `src/App.tsx`**

```tsx
import { useState } from 'react';
import { AppStateProvider } from './store/AppStateContext';
import { JourneyMap } from './screens/JourneyMap';
import { CoveScreen } from './screens/CoveScreen';
import { CoveSessionResults } from './screens/CoveSessionResults';
import { DrillScreen } from './screens/DrillScreen';
import { SessionResults } from './screens/SessionResults';
import { ParentCorner } from './screens/ParentCorner';
import { CoveSessionSummary, SessionSummary } from './storage/schema';

type Screen =
  | { name: 'map' }
  | { name: 'cove' }
  | { name: 'cove-results'; summary: CoveSessionSummary }
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
          onPlayCove={() => setScreen({ name: 'cove' })}
          onOpenParentCorner={() => setScreen({ name: 'parent' })}
        />
      );
    case 'cove':
      return <CoveScreen onComplete={summary => setScreen({ name: 'cove-results', summary })} />;
    case 'cove-results':
      return (
        <CoveSessionResults
          summary={screen.summary}
          onPlayAgain={() => setScreen({ name: 'cove' })}
          onHome={() => setScreen({ name: 'map' })}
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- App`
Expected: PASS, all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Wire Arrays Cove screens into App navigation"
```

---

### Task 14: Full test suite, build, and lint verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file, old and new, green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (this catches any type drift between tasks, e.g. a signature that changed in one file but not its callers).

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open the app, and click through: Journey Map → Arrays Cove → play a few rounds of different mini-game types → Parent Corner (confirm the new Cove progress panel renders) → back to map. Confirm table zones show "Locked" (fresh save) or remain playable (if testing against a save with existing fact progress, to exercise `coveGateExempt`).

- [ ] **Step 5: Commit if any fixes were needed**

If Steps 1–3 required fixes, commit them:

```bash
git add -A
git commit -m "Fix issues found in full-suite/build/lint verification"
```

If no fixes were needed, this task produces no commit — just confirms the branch is clean.
