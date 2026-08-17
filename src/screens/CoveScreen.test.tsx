import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppStateProvider } from '../store/AppStateContext';
import { CoveScreen } from './CoveScreen';
import { saveState } from '../storage/persistence';
import { createDefaultState } from '../storage/schema';
import { CONCEPT_SKILL_IDS } from '../engine/coveEngine';

function seedAllMasteredExceptWhenToMultiply() {
  const state = createDefaultState();
  for (const id of CONCEPT_SKILL_IDS) {
    if (id === 'when-to-multiply') continue;
    state.coveSkills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
  }
  saveState(state);
}

// Constant low rng: generateWhenToMultiply's `asMultiply = rng() < 0.5` is always
// true, so correctChoice is always 'multiply' — makes every round's answer known.
const alwaysMultiplyRng = () => 0.1;

describe('CoveScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('runs a 10-round session, all correct, and calls onComplete with a full-marks summary', () => {
    seedAllMasteredExceptWhenToMultiply();
    const onComplete = vi.fn();
    render(
      <AppStateProvider>
        <CoveScreen onComplete={onComplete} rng={alwaysMultiplyRng} />
      </AppStateProvider>
    );

    for (let round = 0; round < 10; round++) {
      fireEvent.click(screen.getByTestId('word-problem-option-multiply'));
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary.cardsTotal).toBe(10);
    expect(summary.cardsCorrect).toBe(10);
    expect(summary.stars).toBe(3);
    expect(summary.newlyMasteredSkills).toEqual(['when-to-multiply']);
    expect(summary.coveMastered).toBe(true);
  });

  it('shows round progress as "N / 10"', () => {
    seedAllMasteredExceptWhenToMultiply();
    render(
      <AppStateProvider>
        <CoveScreen onComplete={vi.fn()} rng={alwaysMultiplyRng} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('cove-progress')).toHaveTextContent('1 / 10');
  });
});
