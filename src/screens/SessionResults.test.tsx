import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionResults } from './SessionResults';
import { SessionSummary } from '../storage/schema';

const summary: SessionSummary = {
  date: '2026-07-10',
  table: 2,
  stars: 3,
  cardsCorrect: 20,
  cardsTotal: 20,
  newlyMastered: ['2-9', '2-11'],
};

describe('SessionResults', () => {
  it('shows the score and zone name', () => {
    render(<SessionResults summary={summary} onPlayAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByTestId('score')).toHaveTextContent('20 / 20');
    expect(screen.getByText('Sunlit Reef')).toBeInTheDocument();
  });

  it('shows newly mastered count when facts were mastered', () => {
    render(<SessionResults summary={summary} onPlayAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByTestId('newly-mastered')).toHaveTextContent('2 new facts mastered!');
  });

  it('calls onPlayAgain and onHome from their buttons', async () => {
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<SessionResults summary={summary} onPlayAgain={onPlayAgain} onHome={onHome} />);
    await userEvent.click(screen.getByText('Play again'));
    await userEvent.click(screen.getByText('Back to map'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
