import { describe, it, expect } from 'vitest';
import { factKeyFor, factsForZone, ZONES, isZoneMastered, currentUnlockedZone } from './zones';
import { FactState } from './types';

describe('factKeyFor', () => {
  it('produces the same key regardless of argument order', () => {
    expect(factKeyFor(3, 7)).toBe(factKeyFor(7, 3));
  });

  it('produces a low-high formatted key', () => {
    expect(factKeyFor(7, 3)).toBe('3-7');
  });
});

describe('factsForZone', () => {
  it('returns 11 facts for a table, one per multiplier 2..12', () => {
    const facts = factsForZone(6);
    expect(facts).toHaveLength(11);
    expect(facts[0]).toEqual({ a: 6, b: 2 });
    expect(facts[10]).toEqual({ a: 6, b: 12 });
  });
});

describe('ZONES', () => {
  it('covers tables 2 through 12 in order', () => {
    expect(ZONES.map(z => z.table)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('gives every zone a unique name and creature', () => {
    const names = new Set(ZONES.map(z => z.name));
    const creatures = new Set(ZONES.map(z => z.creature));
    expect(names.size).toBe(ZONES.length);
    expect(creatures.size).toBe(ZONES.length);
  });
});

function masteredFact(a: number, b: number): FactState {
  return { a, b, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' };
}

describe('isZoneMastered', () => {
  it('is false when no facts are recorded', () => {
    expect(isZoneMastered(2, {})).toBe(false);
  });

  it('is true only when every fact 2..12 for the table is mastered', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      facts[factKeyFor(2, b)] = masteredFact(2, b);
    }
    expect(isZoneMastered(2, facts)).toBe(true);
  });

  it('is false if even one fact in the table is not mastered', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      facts[factKeyFor(2, b)] = masteredFact(2, b);
    }
    facts[factKeyFor(2, 12)] = { a: 2, b: 12, attempts: [], mastery: 'known', lastSeen: '2026-07-10' };
    expect(isZoneMastered(2, facts)).toBe(false);
  });
});

describe('currentUnlockedZone', () => {
  it('starts at table 2 with no facts recorded', () => {
    expect(currentUnlockedZone({})).toBe(2);
  });

  it('advances to the next unmastered table', () => {
    const facts: Record<string, FactState> = {};
    for (let b = 2; b <= 12; b++) {
      facts[factKeyFor(2, b)] = masteredFact(2, b);
    }
    expect(currentUnlockedZone(facts)).toBe(3);
  });

  it('stays on 12 once every table is mastered', () => {
    const facts: Record<string, FactState> = {};
    for (let table = 2; table <= 12; table++) {
      for (let b = 2; b <= 12; b++) {
        facts[factKeyFor(table, b)] = masteredFact(table, b);
      }
    }
    expect(currentUnlockedZone(facts)).toBe(12);
  });
});
