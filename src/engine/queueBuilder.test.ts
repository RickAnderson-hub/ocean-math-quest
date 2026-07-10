import { describe, it, expect } from 'vitest';
import { buildSessionQueue, SESSION_SIZE } from './queueBuilder';
import { factKeyFor } from './zones';
import { FactState } from './types';

function fixedRng() {
  return () => 0.5; // deterministic "shuffle"
}

describe('buildSessionQueue', () => {
  it('returns exactly SESSION_SIZE cards', () => {
    const queue = buildSessionQueue(2, {}, fixedRng());
    expect(queue).toHaveLength(SESSION_SIZE);
  });

  it('only draws current-table cards when no facts are mastered yet', () => {
    const queue = buildSessionQueue(2, {}, fixedRng());
    expect(queue.every(card => card.a === 2 || card.b === 2)).toBe(true);
  });

  it('mixes in review cards from mastered tables', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      const key = factKeyFor(5, b);
      facts[key] = { a: 5, b, attempts: [], mastery: 'mastered', lastSeen: '2026-07-01' };
    }
    const queue = buildSessionQueue(6, facts, fixedRng());
    const reviewCards = queue.filter(card => card.a === 5 || card.b === 5);
    expect(reviewCards.length).toBeGreaterThan(0);
    expect(reviewCards.length).toBeLessThanOrEqual(Math.round(SESSION_SIZE * 0.25));
  });

  it('prioritizes learning facts over unseen facts in the current table', () => {
    const facts: Record<string, FactState> = {};
    const learningKey = factKeyFor(4, 9);
    facts[learningKey] = { a: 4, b: 9, attempts: [], mastery: 'learning', lastSeen: '2026-07-01' };
    const queue = buildSessionQueue(4, facts, fixedRng());
    const learningCount = queue.filter(card => card.key === learningKey).length;
    expect(learningCount).toBeGreaterThan(1);
  });
});
