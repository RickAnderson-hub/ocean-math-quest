import { useRef, useState } from 'react';
import { NumberPad } from '../components/NumberPad';
import { ComboMeter } from '../components/ComboMeter';
import { buildSessionQueue, QueueCard } from '../engine/queueBuilder';
import { useAppState } from '../store/AppStateContext';
import { SessionSummary } from '../storage/schema';

const RECALL_THRESHOLD_MS = 3000;
const FEEDBACK_DELAY_MS = 600;

interface DrillScreenProps {
  table: number;
  onComplete: (summary: SessionSummary) => void;
}

export function DrillScreen({ table, onComplete }: DrillScreenProps) {
  const { state, recordFactAttempt, addSession } = useAppState();
  const [queue, setQueue] = useState<QueueCard[]>(() => buildSessionQueue(table, state.facts));
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const cardStartRef = useRef(performance.now());
  const statsRef = useRef({ correct: 0, total: 0, newlyMastered: new Set<string>() });

  const card = queue[index];
  if (!card) {
    return null;
  }

  function submit() {
    if (value === '') return;
    const elapsedMs = performance.now() - cardStartRef.current;
    const correct = Number(value) === card.a * card.b;
    const today = new Date().toISOString().slice(0, 10);

    statsRef.current.total += 1;
    if (correct) statsRef.current.correct += 1;

    const wasAlreadyMastered = state.facts[card.key]?.mastery === 'mastered';
    recordFactAttempt(card.a, card.b, { date: today, ms: elapsedMs, correct });

    if (correct && elapsedMs <= RECALL_THRESHOLD_MS) {
      setCombo(c => c + 1);
      if (!wasAlreadyMastered) {
        statsRef.current.newlyMastered.add(card.key);
      }
    } else {
      setCombo(0);
    }

    setFeedback(correct ? 'correct' : 'wrong');
    setValue('');

    setTimeout(() => {
      setFeedback(null);
      let nextQueue = queue;
      if (!correct) {
        nextQueue = [...queue, card];
        setQueue(nextQueue);
      }
      const nextIndex = index + 1;
      if (nextIndex >= nextQueue.length) {
        finishSession();
      } else {
        setIndex(nextIndex);
        cardStartRef.current = performance.now();
      }
    }, FEEDBACK_DELAY_MS);
  }

  function finishSession() {
    const { correct, total, newlyMastered } = statsRef.current;
    const accuracy = total === 0 ? 0 : correct / total;
    const stars: 1 | 2 | 3 = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    const summary: SessionSummary = {
      date: new Date().toISOString().slice(0, 10),
      table,
      stars,
      cardsCorrect: correct,
      cardsTotal: total,
      newlyMastered: Array.from(newlyMastered),
    };
    addSession(summary);
    onComplete(summary);
  }

  return (
    <div className="drill-screen">
      <ComboMeter combo={combo} />
      <div className="progress-dots" data-testid="progress">
        {index + 1} / {queue.length}
      </div>
      <div className={`card ${feedback ?? ''}`} data-testid="card">
        {card.a} &times; {card.b} = ?
      </div>
      <NumberPad
        value={value}
        onDigit={digit => setValue(v => v + digit)}
        onBackspace={() => setValue(v => v.slice(0, -1))}
        onSubmit={submit}
        disabled={feedback !== null}
      />
    </div>
  );
}
