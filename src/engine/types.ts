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
