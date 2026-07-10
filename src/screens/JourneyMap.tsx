import { currentUnlockedZone, isZoneMastered, ZONES } from '../engine/zones';
import { useAppState } from '../store/AppStateContext';

interface JourneyMapProps {
  onPlay: (table: number) => void;
  onOpenParentCorner: () => void;
}

export function JourneyMap({ onPlay, onOpenParentCorner }: JourneyMapProps) {
  const { state } = useAppState();
  const unlocked = currentUnlockedZone(state.facts);

  return (
    <div className="journey-map">
      <button
        type="button"
        className="parent-corner-gear"
        aria-label="parent corner"
        onClick={onOpenParentCorner}
      >
        ⚙
      </button>
      <ul>
        {ZONES.map(zone => {
          const mastered = isZoneMastered(zone.table, state.facts);
          const isCurrent = zone.table === unlocked;
          const isLocked = zone.table > unlocked;

          return (
            <li key={zone.table} data-testid={`zone-${zone.table}`}>
              <span>
                {zone.name} ({zone.table}s)
              </span>
              {mastered && <span data-testid={`creature-${zone.table}`}>{zone.creature}</span>}
              {!isLocked && (
                <button type="button" onClick={() => onPlay(zone.table)}>
                  {isCurrent ? 'Play' : 'Replay'}
                </button>
              )}
              {isLocked && <span>Locked</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
