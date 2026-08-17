# Arrays Cove — Design

**Date:** 2026-08-17
**Status:** Approved design, pending implementation plan
**Goal:** Teach multiplication *concepts* — arrays, the commutative and associative properties, equivalent facts, and recognizing when to multiply — as a gated zone before the existing fact-fluency drilling begins. Reinforces ideas his school has just introduced; not first-teaching.

Division concepts (÷ symbol, "how many tens/fives in", remainders, commutative property applied to division) are explicitly **out of scope** for this spec — deferred to a follow-up design once Arrays Cove ships and division is closer to being taught at school. This mirrors [[ocean-math-quest-project]]'s original plan to add a division mode later without a data migration.

## Overview

**Arrays Cove** is a new zone-0, placed at the surface before the sub's first dive to Sunlit Reef (2× table). It gates entry to the existing fluency-drilling zones: he must clear the Cove before Sunlit Reef unlocks, same mastery-gate mechanism the existing zones use for each other.

Unlike the drilling zones, the Cove is **concept work, not speed work** — no timing pressure, no multi-day mastery requirement. A skill "clicks" after a run of consecutive correct answers.

## The eight mini-games

All operate on numbers 1–10 and share two components: `ArrayGrid` (tap-to-build rows×cols grid, live sentence, rotate action) and `WordProblemPicker` (scenario text + candidate answers).

1. **When to Multiply** — word problem + two candidate equations (one multiplication, one addition); pick the one that fits. E.g. "3 boxes, 4 fish in each" (multiply) vs. "3 fish, then 4 more fish" (add). Uses `WordProblemPicker`.
2. **Build an Array** — given a target product, tap to build a matching rows×cols grid; the sentence `a × b = target` renders live. Uses `ArrayGrid`.
3. **Spin to Commute** — given a built array, a rotate action turns it 90°, showing `3×4` and `4×3` are the same array turned sideways. Uses `ArrayGrid`'s rotate mode.
4. **Commute & Solve** — word problem solvable as either `a×b` or `b×a`; child picks/builds either orientation. Uses `ArrayGrid` + `WordProblemPicker`.
5. **Equivalent Facts** — match pairs of facts with the same product (e.g. `2×6` and `4×3`) by building/comparing two arrays side by side. Uses `ArrayGrid` (dual instance).
6. **True or False** — a number sentence (`7×4 = 30`) with a true/false judgment; quick, no shared component, new lightweight `TrueFalseCard`.
7. **Regroup the Crates** — associative property: three small groups can be bracketed two ways, `(2×3)×4` and `2×(3×4)`, same total both times. New `GroupingBoard` component (extends `ArrayGrid` concepts to 3 factors).
8. **How Many Wheels?** — factor-pairs word problem ("24 wheels, 4 per car — how many cars?"); build the array to find the missing factor. Uses `ArrayGrid` + `WordProblemPicker`.

## Mastery & data model

New `ConceptSkillState` per skill (8 skills, one per mini-game above):

```ts
interface ConceptSkillState {
  skillId: ConceptSkillId; // 'when-to-multiply' | 'build-array' | 'commute-spin' |
                            // 'commute-solve' | 'equivalent-facts' | 'true-false' |
                            // 'associative' | 'factor-pairs'
  recentCorrect: boolean[];  // rolling window, capped
  mastered: boolean;
}
```

- A skill is **mastered** after 5 consecutive correct answers (no multi-day requirement — this is one-time conceptual understanding, not maintained fact recall like the drilling engine).
- The **Cove is mastered** when all 8 skills are mastered → celebration → Sunlit Reef unlocks.
- Session/round selection within the Cove prioritizes unmastered skills, round-robin style, so no single mini-game type dominates a sitting.

`AppState` gains a `coveSkills: Record<ConceptSkillId, ConceptSkillState>` field; `version` bumps and the existing migration step handles two cases:

- **Fresh save** (no existing progress): all 8 `coveSkills` start unmastered; the Cove is the first, unlocked zone.
- **Pre-existing save** (already has `facts` progress from before the Cove existed): migration marks all 8 `coveSkills` as mastered by default, so a player who's already past Sunlit Reef isn't retroactively locked out of a zone that didn't exist when they started.

`zones.ts` gets:
```ts
export const ARRAYS_COVE = { id: 'arrays-cove', name: 'Arrays Cove' } as const;
```
prepended conceptually before `ZONES`; `currentUnlockedZone`-equivalent logic checks Cove mastery before falling through to the existing table-based zone logic.

## Screens

- **`CoveScreen`** (parallel to `DrillScreen`): picks the next unmastered skill round-robin, renders that mini-game, records the attempt. No timer UI (concept work).
- **`SessionResults`**: reused, with Cove-specific copy ("You unlocked Sunlit Reef!" vs. the existing per-fact-mastery messaging) when the Cove is freshly cleared.
- **`JourneyMap`**: gains a Cove pin/stop before the Sunlit Reef pin, using the same locked/unlocked/mastered visual language as existing zones (silhouette → active → creature-revealed, though the Cove has no creature — maybe a "toolkit unlocked" badge instead of a creature icon).
- **`ParentCorner`**: gains an 8-skill Cove progress row alongside the existing 2–12 fact heatmap.

## Tech & testing

Same stack and conventions as the existing app (React+TS+Vite, Vitest). `ArrayGrid`, `WordProblemPicker`, `TrueFalseCard`, `GroupingBoard` are new components under `src/components/`; Cove-specific engine logic (skill mastery, round selection) lives in `src/engine/` alongside `masteryEngine.ts`, as pure functions following the same pattern.

## Explicitly out of scope

- Division concepts of any kind (÷ symbol, remainders, "how many tens/fives in", commutative property for division) — follow-up spec once division is closer at school.
- Any change to the existing fact-drilling engine, queue builder, or fluency mastery thresholds for tables 2–12.
- Multiple child profiles, accounts, backend, monetization.
