import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, exportStateJson, importStateJson } from './persistence';
import { createDefaultState, STORAGE_KEY } from './schema';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns a default state when nothing is stored', () => {
    const state = loadState();
    expect(state.version).toBe(1);
    expect(state.facts).toEqual({});
    expect(state.sessions).toEqual([]);
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
});
