import { SessionSummary } from '../storage/schema';
import { ZONES } from '../engine/zones';

interface SessionResultsProps {
  summary: SessionSummary;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function SessionResults({ summary, onPlayAgain, onHome }: SessionResultsProps) {
  const zone = ZONES.find(z => z.table === summary.table);

  return (
    <div className="session-results">
      <h2>{'⭐'.repeat(summary.stars)}</h2>
      <p data-testid="score">
        {summary.cardsCorrect} / {summary.cardsTotal}
      </p>
      {summary.newlyMastered.length > 0 && (
        <p data-testid="newly-mastered">
          {summary.newlyMastered.length} new fact{summary.newlyMastered.length === 1 ? '' : 's'} mastered!
        </p>
      )}
      <p>{zone?.name}</p>
      <button type="button" onClick={onPlayAgain}>
        Play again
      </button>
      <button type="button" onClick={onHome}>
        Back to map
      </button>
    </div>
  );
}
