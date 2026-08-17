import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoveSessionResults } from './CoveSessionResults';
import { CoveSessionSummary } from '../storage/schema';

const baseSummary: CoveSessionSummary = {
  date: '2026-08-17',
  stars: 3,
  cardsCorrect: 9,
  cardsTotal: 10,
  newlyMasteredSkills: [],
  coveMastered: false,
};

describe('CoveSessionResults', () => {
  it('shows the score and star rating', () => {
    render(<CoveSessionResults summary={baseSummary} onPlayAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByTestId('score')).toHaveTextContent('9 / 10');
  });

  it('shows a newly-mastered message when skills were mastered this session', () => {
    render(
      <CoveSessionResults
        summary={{ ...baseSummary, newlyMasteredSkills: ['when-to-multiply'] }}
        onPlayAgain={vi.fn()}
        onHome={vi.fn()}
      />
    );
    expect(screen.getByTestId('newly-mastered')).toHaveTextContent('1 new skill mastered!');
  });

  it('shows the cove-mastered message when the cove was just completed', () => {
    render(
      <CoveSessionResults summary={{ ...baseSummary, coveMastered: true }} onPlayAgain={vi.fn()} onHome={vi.fn()} />
    );
    expect(screen.getByTestId('cove-mastered-message')).toHaveTextContent('You unlocked Sunlit Reef!');
  });

  it('calls onPlayAgain and onHome from their buttons', async () => {
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<CoveSessionResults summary={baseSummary} onPlayAgain={onPlayAgain} onHome={onHome} />);
    await userEvent.click(screen.getByText('Play again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText('Back to map'));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
