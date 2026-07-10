import { ZoneDefinition, FactState } from './types';

export const ZONES: ZoneDefinition[] = [
  { table: 2, name: 'Sunlit Reef', creature: 'Clownfish' },
  { table: 3, name: 'Shallow Shelf', creature: 'Sea Turtle' },
  { table: 4, name: 'Kelp Forest', creature: 'Sea Otter' },
  { table: 5, name: 'Coral Canyon', creature: 'Octopus' },
  { table: 6, name: 'Open Water', creature: 'Dolphin' },
  { table: 7, name: 'Twilight Zone', creature: 'Hammerhead Shark' },
  { table: 8, name: 'Midnight Zone', creature: 'Anglerfish' },
  { table: 9, name: 'Deep Current', creature: 'Giant Squid' },
  { table: 10, name: 'Volcanic Vent', creature: 'Vampire Squid' },
  { table: 11, name: 'Abyssal Plain', creature: 'Gulper Eel' },
  { table: 12, name: 'The Trench', creature: 'Colossal Kraken' },
];

export function factKeyFor(a: number, b: number): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}-${hi}`;
}

export function factsForZone(table: number): Array<{ a: number; b: number }> {
  const facts: Array<{ a: number; b: number }> = [];
  for (let b = 2; b <= 12; b++) {
    facts.push({ a: table, b });
  }
  return facts;
}

export function isZoneMastered(table: number, facts: Record<string, FactState>): boolean {
  return factsForZone(table).every(({ a, b }) => {
    const key = factKeyFor(a, b);
    return facts[key]?.mastery === 'mastered';
  });
}

export function currentUnlockedZone(facts: Record<string, FactState>): number {
  for (const zone of ZONES) {
    if (!isZoneMastered(zone.table, facts)) {
      return zone.table;
    }
  }
  return ZONES[ZONES.length - 1].table;
}
