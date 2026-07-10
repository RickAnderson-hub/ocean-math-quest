import { factKeyFor, factsForZone } from './zones';
import { FactMastery, FactState } from './types';

export const SESSION_SIZE = 20;
export const REVIEW_RATIO = 0.25;

export interface QueueCard {
  a: number;
  b: number;
  key: string;
}

function priorityFor(mastery: FactMastery | undefined): number {
  switch (mastery) {
    case 'learning':
      return 0;
    case 'known':
      return 1;
    case 'mastered':
      return 3;
    case 'unseen':
    default:
      return 2;
  }
}

function repeatToLength<T>(items: T[], length: number): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < length; i++) {
    out.push(items[i % items.length]);
  }
  return out;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildSessionQueue(
  currentTable: number,
  facts: Record<string, FactState>,
  rng: () => number = Math.random
): QueueCard[] {
  const reviewCount = Math.round(SESSION_SIZE * REVIEW_RATIO);
  const currentCount = SESSION_SIZE - reviewCount;

  const currentFacts: QueueCard[] = factsForZone(currentTable).map(({ a, b }) => ({
    a,
    b,
    key: factKeyFor(a, b),
  }));

  const sortedCurrent = [...currentFacts].sort(
    (x, y) => priorityFor(facts[x.key]?.mastery) - priorityFor(facts[y.key]?.mastery)
  );
  const currentPicks = repeatToLength(sortedCurrent, currentCount);

  const masteredFacts: QueueCard[] = Object.entries(facts)
    .filter(([, state]) => state.mastery === 'mastered')
    .map(([key, state]) => ({ a: state.a, b: state.b, key }));

  const sortedByLeastRecentlySeen = [...masteredFacts].sort((x, y) => {
    const lx = facts[x.key]?.lastSeen ?? '';
    const ly = facts[y.key]?.lastSeen ?? '';
    return lx.localeCompare(ly);
  });

  const reviewPicks =
    masteredFacts.length > 0
      ? repeatToLength(sortedByLeastRecentlySeen, reviewCount)
      : repeatToLength(sortedCurrent, reviewCount);

  return shuffle([...currentPicks, ...reviewPicks], rng);
}
