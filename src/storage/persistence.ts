import { AppState, createDefaultState, SCHEMA_VERSION, STORAGE_KEY } from './schema';

export function migrateState(parsed: unknown): AppState {
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { version?: unknown }).version !== 'number'
  ) {
    return createDefaultState();
  }
  const candidate = parsed as AppState;
  if (candidate.version === SCHEMA_VERSION) {
    return candidate;
  }
  // Future schema migrations, chained by version number, go here.
  return createDefaultState();
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();
  try {
    return migrateState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateJson(json: string): AppState {
  return migrateState(JSON.parse(json));
}
