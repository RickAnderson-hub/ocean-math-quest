import { currentUnlockedZone, isZoneMastered, ZONES } from '../engine/zones';
import { isCoveMastered, isTableZonesUnlocked } from '../engine/coveEngine';
import { useAppState } from '../store/AppStateContext';
import './JourneyMap.css';

interface JourneyMapProps {
  onPlay: (table: number) => void;
  onPlayCove: () => void;
  onOpenParentCorner: () => void;
}

export function JourneyMap({ onPlay, onPlayCove, onOpenParentCorner }: JourneyMapProps) {
  const { state } = useAppState();
  const coveMastered = isCoveMastered(state.coveSkills);
  const tableZonesUnlocked = isTableZonesUnlocked(state.coveSkills, state.coveGateExempt);
  const unlocked = currentUnlockedZone(state.facts);

  return (
    <div className="journey-map">
      <header className="journey-map__header">
        <h1 className="journey-map__title">Ocean Math Quest</h1>
        <button
          type="button"
          className="parent-corner-gear"
          aria-label="parent corner"
          onClick={onOpenParentCorner}
        >
          ⚙
        </button>
      </header>
      <ol className="dive-path">
        <li
          key="arrays-cove"
          data-testid="zone-arrays-cove"
          className={`dive-node dive-node--left dive-node--${coveMastered ? 'mastered' : 'current'}`}
        >
          <div className="dive-node__card">
            <span className="dive-node__label">Arrays Cove</span>
            {coveMastered && (
              <span data-testid="cove-badge" className="dive-node__creature">
                Toolkit unlocked!
              </span>
            )}
            <button type="button" className="dive-node__action" onClick={onPlayCove}>
              {coveMastered ? 'Replay' : 'Play'}
            </button>
          </div>
        </li>
        {ZONES.map((zone, i) => {
          const mastered = isZoneMastered(zone.table, state.facts);
          const isCurrent = tableZonesUnlocked && zone.table === unlocked;
          const isLocked = !tableZonesUnlocked || zone.table > unlocked;
          const side = (i + 1) % 2 === 0 ? 'left' : 'right';
          const status = isLocked ? 'locked' : isCurrent ? 'current' : 'mastered';

          return (
            <li
              key={zone.table}
              data-testid={`zone-${zone.table}`}
              className={`dive-node dive-node--${side} dive-node--${status}`}
              style={{ '--depth': zone.table } as React.CSSProperties}
            >
              <span className="dive-node__depth" aria-hidden="true">
                {zone.table}
              </span>
              <div className="dive-node__card">
                <span className="dive-node__label">
                  {zone.name} ({zone.table}s)
                </span>
                {mastered && (
                  <span data-testid={`creature-${zone.table}`} className="dive-node__creature">
                    {zone.creature}
                  </span>
                )}
                {!isLocked && (
                  <button type="button" className="dive-node__action" onClick={() => onPlay(zone.table)}>
                    {isCurrent ? 'Play' : 'Replay'}
                  </button>
                )}
                {isLocked && <span className="dive-node__lock">Locked</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
