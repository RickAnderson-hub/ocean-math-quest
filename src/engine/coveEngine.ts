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
  return {
    recentCorrect,
    mastered: skillState.mastered || computeConceptMastery(recentCorrect),
  };
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
