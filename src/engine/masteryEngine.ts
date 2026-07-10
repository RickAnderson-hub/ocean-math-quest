import { Attempt, FactMastery, FactState } from './types';

export const RECALL_THRESHOLD_MS = 3000;
export const MASTERY_RECALL_COUNT = 3;
export const MASTERY_MIN_DISTINCT_DAYS = 2;
export const MAX_ATTEMPTS_HISTORY = 20;

export function computeFactMastery(attempts: Attempt[]): FactMastery {
  if (attempts.length === 0) return 'unseen';

  const recalled = attempts.filter(a => a.correct && a.ms <= RECALL_THRESHOLD_MS);
  const distinctRecalledDays = new Set(recalled.map(a => a.date));

  if (recalled.length >= MASTERY_RECALL_COUNT && distinctRecalledDays.size >= MASTERY_MIN_DISTINCT_DAYS) {
    return 'mastered';
  }

  const last = attempts[attempts.length - 1];
  return last.correct ? 'known' : 'learning';
}

export function recordAttempt(fact: FactState, attempt: Attempt): FactState {
  const attempts = [...fact.attempts, attempt].slice(-MAX_ATTEMPTS_HISTORY);
  return {
    ...fact,
    attempts,
    mastery: computeFactMastery(attempts),
    lastSeen: attempt.date,
  };
}
