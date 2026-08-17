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
