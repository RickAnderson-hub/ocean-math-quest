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

  it('counts an answer at exactly the recall threshold (3000ms) as recalled', () => {
    const attempts = [
      { date: '2026-07-10', ms: 3000, correct: true },
      { date: '2026-07-10', ms: 3000, correct: true },
      { date: '2026-07-11', ms: 3000, correct: true },
    ];
    expect(computeFactMastery(attempts)).toBe('mastered');
  });

  it('does not master on only 2 fast-correct answers across 2 distinct days', () => {
    const attempts = [
      { date: '2026-07-10', ms: 1000, correct: true },
      { date: '2026-07-11', ms: 1000, correct: true },
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
