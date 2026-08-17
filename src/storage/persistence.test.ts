import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, exportStateJson, importStateJson } from './persistence';
import { createDefaultState, STORAGE_KEY } from './schema';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns a default state when nothing is stored', () => {
    const state = loadState();
    expect(state.version).toBe(2);
    expect(state.facts).toEqual({});
    expect(state.sessions).toEqual([]);
    expect(state.coveGateExempt).toBe(false);
  });

  it('saveState then loadState round-trips the data', () => {
    const state = createDefaultState();
    state.facts['2-3'] = { a: 2, b: 3, attempts: [], mastery: 'known', lastSeen: '2026-07-10' };
    saveState(state);
    const loaded = loadState();
    expect(loaded.facts['2-3'].mastery).toBe('known');
  });

  it('loadState falls back to default on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const state = loadState();
    expect(state).toEqual(createDefaultState());
  });

  it('loadState falls back to default on an unknown schema version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }));
    const state = loadState();
    expect(state).toEqual(createDefaultState());
  });

  it('exportStateJson and importStateJson round-trip', () => {
    const state = createDefaultState();
    state.facts['4-4'] = { a: 4, b: 4, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' };
    const json = exportStateJson(state);
    const imported = importStateJson(json);
    expect(imported.facts['4-4'].mastery).toBe('mastered');
  });

  it('importStateJson throws (rather than silently returning a default) on an unrecognized version', () => {
    const json = JSON.stringify({ version: 999, profile: { name: 'X', muted: false }, facts: {}, sessions: [] });
    expect(() => importStateJson(json)).toThrow();
  });

  it('importStateJson throws on invalid JSON', () => {
    expect(() => importStateJson('{not valid json')).toThrow();
  });

  it('importStateJson throws when facts has a fundamentally invalid shape', () => {
    const json = JSON.stringify({ version: 1, profile: { name: 'X', muted: false }, facts: 'nope', sessions: [] });
    expect(() => importStateJson(json)).toThrow();
  });

  it('importStateJson defaults missing/null facts and sessions to empty', () => {
    const json = JSON.stringify({ version: 1, profile: { name: 'X', muted: false }, facts: null, sessions: null });
    const imported = importStateJson(json);
    expect(imported.facts).toEqual({});
    expect(imported.sessions).toEqual([]);
  });

  it('migrates a v1 save with existing fact progress: cove unmastered but gate-exempt', () => {
    const v1 = {
      version: 1,
      profile: { name: 'Explorer', muted: false },
      facts: { '2-3': { a: 2, b: 3, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' } },
      sessions: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));
    const state = loadState();
    expect(state.version).toBe(2);
    expect(state.coveGateExempt).toBe(true);
    expect(Object.values(state.coveSkills).every(s => s.mastered === false)).toBe(true);
    expect(state.facts['2-3'].mastery).toBe('mastered');
  });

  it('migrates a v1 save with no fact progress: cove unmastered, not gate-exempt', () => {
    const v1 = {
      version: 1,
      profile: { name: 'Explorer', muted: false },
      facts: {},
      sessions: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));
    const state = loadState();
    expect(state.coveGateExempt).toBe(false);
    expect(Object.values(state.coveSkills).every(s => s.mastered === false)).toBe(true);
  });

  it('defaults coveSkills and coveGateExempt when missing from an already-v2 save', () => {
    const v2 = {
      version: 2,
      profile: { name: 'Explorer', muted: false },
      facts: {},
      sessions: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
    const state = loadState();
    expect(state.coveGateExempt).toBe(false);
    expect(Object.values(state.coveSkills)).toHaveLength(8);
  });

  it('fills in missing coveSkills keys when a v2 save has a partial coveSkills object', () => {
    const v2 = {
      version: 2,
      profile: { name: 'Explorer', muted: false },
      facts: {},
      sessions: [],
      coveGateExempt: false,
      coveSkills: {
        'when-to-multiply': { recentCorrect: [true, true, true, true, true], mastered: true },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
    const state = loadState();
    expect(Object.keys(state.coveSkills)).toHaveLength(8);
    expect(state.coveSkills['when-to-multiply']).toEqual({
      recentCorrect: [true, true, true, true, true],
      mastered: true,
    });
    expect(state.coveSkills['build-array']).toEqual({ recentCorrect: [], mastered: false });
    expect(state.coveSkills['commute-spin'].mastered).toBe(false);
  });

  it('importStateJson accepts a v1 backup and migrates it', () => {
    const v1 = {
      version: 1,
      profile: { name: 'Explorer', muted: false },
      facts: { '4-4': { a: 4, b: 4, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' } },
      sessions: [],
    };
    const imported = importStateJson(JSON.stringify(v1));
    expect(imported.version).toBe(2);
    expect(imported.coveGateExempt).toBe(true);
    expect(imported.facts['4-4'].mastery).toBe('mastered');
  });
});
