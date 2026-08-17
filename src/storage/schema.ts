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
