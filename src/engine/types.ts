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
