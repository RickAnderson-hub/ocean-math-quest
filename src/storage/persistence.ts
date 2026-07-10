import { AppState, createDefaultState, SCHEMA_VERSION, STORAGE_KEY } from './schema';

/**
 * Validates that a candidate object has a plausible AppState shape,
 * defaulting missing/null fields where safe and throwing on shapes that
 * are fundamentally wrong (e.g. facts is a string, not an object).
 */
function validateShape(candidate: AppState): AppState {
  const facts = (candidate as { facts?: unknown }).facts;
  if (facts !== undefined && facts !== null && (typeof facts !== 'object' || Array.isArray(facts))) {
    throw new Error('Cannot import: "facts" has an invalid shape');
  }
  const sessions = (candidate as { sessions?: unknown }).sessions;
  if (sessions !== undefined && sessions !== null && !Array.isArray(sessions)) {
    throw new Error('Cannot import: "sessions" has an invalid shape');
  }
  return {
    ...candidate,
    facts: (facts as AppState['facts']) ?? {},
    sessions: (sessions as AppState['sessions']) ?? [],
  };
}

/**
 * Lenient migration path used for ordinary app startup from localStorage.
 * Corrupted or incompatible browser storage should never block the app —
 * it silently falls back to a safe default state.
 */
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
    return validateShape(candidate);
  }
  // Future schema migrations, chained by version number, go here.
  return createDefaultState();
}

/**
 * Strict migration path used for explicit, user-initiated imports (e.g.
 * restoring a backup file). Unlike migrateState, it never silently
 * substitutes a default state for unrecognized/invalid data — doing so
 * on an explicit import would silently wipe the user's current progress
 * via the store's autosave effect. Instead it throws so the caller can
 * surface the failure and leave the current state untouched.
 */
export function migrateStateStrict(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Cannot import: data is not a valid progress file');
  }
  const version = (parsed as { version?: unknown }).version;
  if (typeof version !== 'number') {
    throw new Error('Cannot import: missing or invalid version field');
  }
  if (version !== SCHEMA_VERSION) {
    throw new Error(`Cannot import: unrecognized data version (${version})`);
  }
  return validateShape(parsed as AppState);
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
  return migrateStateStrict(JSON.parse(json));
}
