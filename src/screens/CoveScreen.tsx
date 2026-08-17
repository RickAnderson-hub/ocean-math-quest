import { useRef, useState } from 'react';
import { useAppState } from '../store/AppStateContext';
import { buildCoveQueue, CONCEPT_SKILL_IDS, recordSkillAttempt } from '../engine/coveEngine';
import { generateRound, CoveRound } from '../engine/coveContent';
import { ConceptSkillId } from '../engine/types';
import { CoveSessionSummary } from '../storage/schema';
import {
  AssociativeGame,
  BuildArrayGame,
  CommuteSolveGame,
  CommuteSpinGame,
  EquivalentFactsGame,
  FactorPairsGame,
  TrueFalseGame,
  WhenToMultiplyGame,
} from './CoveGames';
import './CoveScreen.css';

const FEEDBACK_DELAY_MS = 600;

interface CoveScreenProps {
  onComplete: (summary: CoveSessionSummary) => void;
  rng?: () => number;
}

export function CoveScreen({ onComplete, rng = Math.random }: CoveScreenProps) {
  const { state, recordCoveSkillAttempt } = useAppState();
  const [skillQueue] = useState<ConceptSkillId[]>(() => buildCoveQueue(state.coveSkills));
  const [rounds] = useState<CoveRound[]>(() => skillQueue.map(id => generateRound(id, rng)));
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const statsRef = useRef({ correct: 0, total: 0, newlyMastered: new Set<ConceptSkillId>() });

  const round = rounds[index];
  if (!round) {
    return null;
  }

  function handleSubmit(correct: boolean) {
    statsRef.current.total += 1;
    if (correct) statsRef.current.correct += 1;

    const previous = state.coveSkills[round.skillId];
    const updated = recordSkillAttempt(previous, correct);
    if (!previous.mastered && updated.mastered) {
      statsRef.current.newlyMastered.add(round.skillId);
    }
    recordCoveSkillAttempt(round.skillId, correct);

    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      const nextIndex = index + 1;
      if (nextIndex >= rounds.length) {
        finishSession();
      } else {
        setIndex(nextIndex);
      }
    }, FEEDBACK_DELAY_MS);
  }

  function finishSession() {
    const { correct, total, newlyMastered } = statsRef.current;
    const accuracy = total === 0 ? 0 : correct / total;
    const stars: 1 | 2 | 3 = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    const coveMastered = CONCEPT_SKILL_IDS.every(
      id => state.coveSkills[id].mastered || newlyMastered.has(id)
    );
    const summary: CoveSessionSummary = {
      date: new Date().toISOString().slice(0, 10),
      stars,
      cardsCorrect: correct,
      cardsTotal: total,
      newlyMasteredSkills: Array.from(newlyMastered),
      coveMastered,
    };
    onComplete(summary);
  }

  return (
    <div className="cove-screen">
      <div className="cove-screen__header">
        <span className="cove-screen__title">Arrays Cove</span>
        <div className="cove-screen__progress" data-testid="cove-progress">
          {index + 1} / {rounds.length}
        </div>
      </div>
      <div className={`cove-screen__card ${feedback ?? ''}`} data-testid="cove-card">
        {renderGame(round, handleSubmit, feedback !== null)}
      </div>
    </div>
  );
}

function renderGame(round: CoveRound, onSubmit: (correct: boolean) => void, disabled: boolean) {
  switch (round.skillId) {
    case 'when-to-multiply':
      return <WhenToMultiplyGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'build-array':
      return <BuildArrayGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'commute-spin':
      return <CommuteSpinGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'commute-solve':
      return <CommuteSolveGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'equivalent-facts':
      return <EquivalentFactsGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'true-false':
      return <TrueFalseGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'associative':
      return <AssociativeGame round={round} onSubmit={onSubmit} disabled={disabled} />;
    case 'factor-pairs':
      return <FactorPairsGame round={round} onSubmit={onSubmit} disabled={disabled} />;
  }
}
