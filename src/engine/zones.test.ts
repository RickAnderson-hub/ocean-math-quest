import { describe, it, expect } from 'vitest';
import { factKeyFor, factsForZone, ZONES } from './zones';

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
