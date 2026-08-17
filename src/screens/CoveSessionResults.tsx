import { CoveSessionSummary } from '../storage/schema';
import './SessionResults.css';

interface CoveSessionResultsProps {
  summary: CoveSessionSummary;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function CoveSessionResults({ summary, onPlayAgain, onHome }: CoveSessionResultsProps) {
  return (
    <div className="session-results">
      <div className={`session-results__card session-results__card--stars-${summary.stars}`}>
        <h2 className="session-results__stars">{'⭐'.repeat(summary.stars)}</h2>
        <p className="session-results__score" data-testid="score">
          {summary.cardsCorrect} / {summary.cardsTotal}
        </p>
        {summary.newlyMasteredSkills.length > 0 && (
          <p className="session-results__mastered" data-testid="newly-mastered">
            {summary.newlyMasteredSkills.length} new skill{summary.newlyMasteredSkills.length === 1 ? '' : 's'} mastered!
          </p>
        )}
        {summary.coveMastered ? (
          <p className="session-results__zone" data-testid="cove-mastered-message">
            You unlocked Sunlit Reef!
          </p>
        ) : (
          <p className="session-results__zone">Arrays Cove</p>
        )}
        <div className="session-results__actions">
          <button
            type="button"
            className="session-results__button session-results__button--primary"
            onClick={onPlayAgain}
          >
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
