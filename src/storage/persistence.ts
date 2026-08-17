import { AppState, createDefaultState, SCHEMA_VERSION, STORAGE_KEY } from './schema';
import { createDefaultCoveSkills } from '../engine/coveEngine';

interface V1AppState {
  version: 1;
  profile: { name: string; muted: boolean };
  facts?: AppState['facts'] | null;
  sessions?: AppState['sessions'] | null;
}

function migrateV1ToV2(v1: V1AppState): AppState {
  const facts = v1.facts ?? {};
  const hasExistingProgress = Object.keys(facts).length > 0;
  return {
    version: 2,
    profile: v1.profile,
    facts,
    coveSkills: createDefaultCoveSkills(),
    coveGateExempt: hasExistingProgress,
    sessions: v1.sessions ?? [],
  };
}

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
  const coveSkills = (candidate as { coveSkills?: unknown }).coveSkills;
  if (coveSkills !== undefined && coveSkills !== null && (typeof coveSkills !== 'object' || Array.isArray(coveSkills))) {
    throw new Error('Cannot import: "coveSkills" has an invalid shape');
  }
  return {
    ...candidate,
    facts: (facts as AppState['facts']) ?? {},
    sessions: (sessions as AppState['sessions']) ?? [],
    coveSkills: (coveSkills as AppState['coveSkills']) ?? createDefaultCoveSkills(),
    coveGateExempt: typeof candidate.coveGateExempt === 'boolean' ? candidate.coveGateExempt : false,
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
  let candidate = parsed as V1AppState | AppState;
  if (candidate.version === 1) {
    candidate = migrateV1ToV2(candidate as V1AppState);
  }
  if (candidate.version === SCHEMA_VERSION) {
    return validateShape(candidate as AppState);
  }
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
  if (version !== 1 && version !== SCHEMA_VERSION) {
    throw new Error(`Cannot import: unrecognized data version (${version})`);
  }
  let candidate = parsed as V1AppState | AppState;
  if (version === 1) {
    candidate = migrateV1ToV2(candidate as V1AppState);
  }
  return validateShape(candidate as AppState);
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
