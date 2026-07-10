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
