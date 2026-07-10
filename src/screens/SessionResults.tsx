import { SessionSummary } from '../storage/schema';
import { ZONES } from '../engine/zones';
import './SessionResults.css';

interface SessionResultsProps {
  summary: SessionSummary;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function SessionResults({ summary, onPlayAgain, onHome }: SessionResultsProps) {
  const zone = ZONES.find(z => z.table === summary.table);

  return (
    <div className="session-results">
      <div className={`session-results__card session-results__card--stars-${summary.stars}`}>
        <h2 className="session-results__stars">{'⭐'.repeat(summary.stars)}</h2>
        <p className="session-results__score" data-testid="score">
          {summary.cardsCorrect} / {summary.cardsTotal}
        </p>
        {summary.newlyMastered.length > 0 && (
          <p className="session-results__mastered" data-testid="newly-mastered">
            {summary.newlyMastered.length} new fact{summary.newlyMastered.length === 1 ? '' : 's'} mastered!
          </p>
        )}
        <p className="session-results__zone">{zone?.name}</p>
        <div className="session-results__actions">
          <button type="button" className="session-results__button session-results__button--primary" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" className="session-results__button" onClick={onHome}>
            Back to map
          </button>
        </div>
      </div>
    </div>
  );
}
