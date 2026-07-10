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
  });
});
