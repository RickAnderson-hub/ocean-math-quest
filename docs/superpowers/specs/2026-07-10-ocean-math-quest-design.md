# Ocean Math Quest — Design

**Date:** 2026-07-10
**Status:** Approved design, pending implementation plan
**Goal:** A fun, engaging web app for practicing multiplication tables (2× through 12×), built primarily for one child, extensible to division practice later. No backend, no accounts, no ads.

## Overview

A single-page React web app themed as an **ocean quest**: a submarine dives deeper as times tables are mastered. Each table is a **depth zone** (2s = sunlit reef … 12s = deep trench). Mastering a table discovers a new sea creature for the player's collection and unlocks the next zone.

All state lives in browser `localStorage`. Deployable as a static site (GitHub Pages/Netlify). Zero running cost.

## Core play loop

- A **session** is ~20 cards, 2–3 minutes.
- A card shows a large equation (`7 × 8 = ?`) with a big on-screen number pad (tablet- and laptop-friendly). The child types the answer.
- Instant feedback: a satisfying success animation, or on a miss, a gentle correction showing the right answer. **Missed cards re-queue later in the same session** so every session ends with a win on every card.
- Each card is silently timed:
  - correct in ≤ 3 seconds → **recalled** (true fluency)
  - correct but slower → **known**
  - wrong → **learning**

## Progression & mastery engine

- Facts are stored as **fact families** `{a, b, product}`. Multiplication renders as `a × b = ?`. Division mode (future) renders the same family as `product ÷ a = ?` with its own mastery track — no data migration required.
- A **fact is mastered** after 3 *recalled* answers spread over at least 2 distinct days (prevents one-evening cramming from faking mastery).
- A **table (zone) is mastered** when all its facts are mastered → celebration → next zone unlocks. Order: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12.
- Each session mixes ~25% **review cards** from mastered tables, selected least-recently-seen first (lightweight spaced repetition).
- Card selection within the current table prioritizes *learning* facts, then *known*, then unseen.

The engine is implemented as **pure functions**:
- `(fact history) → mastery state`
- `(full state) → next session's card queue`

This is the correctness-critical core and carries the unit-test load. It also stays portable (could run server-side unchanged if the app ever becomes a product).

## Fun & engagement layer

No dark patterns: no ads, no fake urgency, no paywalls.

- **Journey map (home screen):** vertical ocean cross-section; the submarine sits at the current depth zone. Mastered zones show their discovered creature; locked zones are dark silhouettes.
- **Combo streaks:** consecutive *recalled* answers build a combo meter with escalating effects (bubbles → glow → full celebration burst).
- **Stars per session:** 1–3 based on accuracy and speed.
- **Creature collection:** each mastered table discovers a themed sea creature (reef fish at 2s … anglerfish/giant squid in the deep zones). A collection screen shows them.
- Snappy animations and sound effects, with a **mute toggle**.

## Screens

1. **Journey map** (home) — ocean depth path, progress, Play button.
2. **Drill screen** — card, number pad, combo meter, session progress dots.
3. **Session results** — stars, newly mastered facts/creatures, replay button.
4. **Parent corner** — behind a small gear icon, not kid-facing:
   - 2–12 × 2–12 **mastery heatmap** of every fact (learning / known / mastered)
   - JSON **export/import** of all progress (device moves, backup)
   - manual override to unlock a zone if ever needed

## Data model (localStorage, single JSON document)

```ts
interface AppState {
  version: number;              // schema version for future migrations
  profile: { name: string; muted: boolean };
  facts: Record<string, FactState>;   // key: "a-b", e.g. "7-8"
  zones: Record<number, ZoneState>;   // key: table number 2..12
  sessions: SessionSummary[];         // recent history, capped
}

interface FactState {
  a: number; b: number;               // product derived
  attempts: Attempt[];                // capped rolling window
  mastery: 'unseen' | 'learning' | 'known' | 'mastered';
  lastSeen: string;                   // ISO date
}

interface Attempt { date: string; ms: number; correct: boolean }
```

`version` field + a tiny migration step on load protects his progress across future app updates (including the division extension).

## Tech & testing

- **Stack:** React + TypeScript + Vite. No backend. CSS animations (no heavy animation libs unless needed).
- **Persistence:** localStorage with schema version + export/import.
- **Testing:** Vitest unit tests on the mastery engine and card-queue builder (the mis-teaching risk lives there). Light component tests for the drill screen flow.
- **Deploy:** static build to GitHub Pages or Netlify.

## Explicitly out of scope (for now)

- Division mode (designed-for, not built)
- Accounts, backend, multi-device sync
- Multiple child profiles
- Monetization features

## Future monetization note

The "son first, money maybe" path: if the app proves itself, candidates are a one-time-purchase polished version, or feeding mastery data into printable review sheets via the existing `math_excercises` PDF generator (Teachers Pay Teachers / Etsy). Nothing in this design blocks either path; the pure-function engine and schema-versioned state keep options open.
