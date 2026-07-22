import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DrillScreen } from './DrillScreen';
import { AppStateProvider } from '../store/AppStateContext';

describe('DrillScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('runs a full session of correct answers and reports 3 stars', () => {
    const onComplete = vi.fn();
    render(
      <AppStateProvider>
        <DrillScreen table={2} onComplete={onComplete} />
      </AppStateProvider>
    );

    for (let i = 0; i < 20; i++) {
      const cardText = screen.getByTestId('card').textContent ?? '';
      const match = cardText.match(/(\d+)\s*×\s*(\d+)/);
      if (!match) throw new Error(`could not parse card text: ${cardText}`);
      const [, aStr, bStr] = match;
      const answer = String(Number(aStr) * Number(bStr));

      for (const digit of answer) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }
      fireEvent.click(screen.getByRole('button', { name: 'submit' }));

      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary.cardsTotal).toBe(20);
    expect(summary.cardsCorrect).toBe(20);
    expect(summary.stars).toBe(3);
    expect(summary.table).toBe(2);
    // Mastery requires 3 recalled answers spanning 2 distinct calendar days, so
    // nothing can become newly mastered within a single first session.
    expect(summary.newlyMastered).toEqual([]);
  });

  it('holds the combo (does not reset) on a correct-but-slow answer', () => {
    render(
      <AppStateProvider>
        <DrillScreen table={2} onComplete={vi.fn()} />
      </AppStateProvider>
    );

    function answerCurrentCard(delayMs: number) {
      const cardText = screen.getByTestId('card').textContent ?? '';
      const match = cardText.match(/(\d+)\s*×\s*(\d+)/);
      if (!match) throw new Error(`could not parse card text: ${cardText}`);
      const [, aStr, bStr] = match;
      const answer = String(Number(aStr) * Number(bStr));

      act(() => {
        vi.advanceTimersByTime(delayMs);
      });
      for (const digit of answer) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }
      fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    answerCurrentCard(100);
    answerCurrentCard(100);
    answerCurrentCard(100);
    expect(screen.getByTestId('combo-meter').textContent).toBe('Combo: 3');

    // Correct, but too slow to count as "recalled" — combo should hold, not reset.
    answerCurrentCard(3500);
    expect(screen.getByTestId('combo-meter').textContent).toBe('Combo: 3');

    answerCurrentCard(100);
    expect(screen.getByTestId('combo-meter').textContent).toBe('Combo: 4');
  });
});
