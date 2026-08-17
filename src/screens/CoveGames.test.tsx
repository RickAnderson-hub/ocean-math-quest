import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('WhenToMultiplyGame', () => {
  it('submits correct=true when the correctChoice option is picked', async () => {
    const onSubmit = vi.fn();
    const round = {
      skillId: 'when-to-multiply' as const,
      prompt: 'p',
      multiplyExpression: '3 × 4',
      addExpression: '3 + 4',
      correctChoice: 'multiply' as const,
    };
    render(<WhenToMultiplyGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('word-problem-option-multiply'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('BuildArrayGame', () => {
  it('submits correct=true only when the built array matches the target', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'build-array' as const, targetProduct: 2 };
    render(<BuildArrayGame round={round} onSubmit={onSubmit} />);
    // starts at 1x1; bump rows to 2 to reach 2x1=2
    await userEvent.click(screen.getByRole('button', { name: 'more rows' }));
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('CommuteSpinGame', () => {
  it('submits correct=true for the rotated-dimensions option', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'commute-spin' as const, a: 3, b: 5 };
    render(<CommuteSpinGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByText('5 rows × 3 columns'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('CommuteSolveGame', () => {
  it('submits correct=true for a matching-product option', async () => {
    const onSubmit = vi.fn();
    const round = {
      skillId: 'commute-solve' as const,
      prompt: 'p',
      correctProduct: 12,
      optionA: { id: 'a', label: '3 × 4 = 12', product: 12 },
      optionB: { id: 'b', label: '4 × 3 = 12', product: 12 },
      optionC: { id: 'c', label: '3 × 4 = 15', product: 15 },
    };
    render(<CommuteSolveGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('word-problem-option-b'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('EquivalentFactsGame', () => {
  it('submits correct=true when a genuinely different equal-product array is built', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'equivalent-facts' as const, a: 3, b: 4 };
    render(<EquivalentFactsGame round={round} onSubmit={onSubmit} />);
    // second (editable) grid starts 1x1; build to 2x6 = 12
    const rowsMore = screen.getAllByRole('button', { name: 'more rows' })[0];
    for (let i = 0; i < 1; i++) await userEvent.click(rowsMore); // 1 -> 2 rows
    const colsMore = screen.getAllByRole('button', { name: 'more columns' })[0];
    for (let i = 0; i < 5; i++) await userEvent.click(colsMore); // 1 -> 6 cols
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('TrueFalseGame', () => {
  it('submits correct=true when the True/False answer matches isTrue', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'true-false' as const, a: 3, b: 4, claimedProduct: 12, isTrue: true };
    render(<TrueFalseGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId('true-false-true'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});

describe('AssociativeGame', () => {
  it('submits correct=true when the typed total equals x*y*z', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'associative' as const, x: 2, y: 3, z: 4 };
    render(<AssociativeGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(onSubmit).toHaveBeenCalledWith(true); // "24"
  });
});

describe('FactorPairsGame', () => {
  it('submits correct=true when the typed answer matches numCars', async () => {
    const onSubmit = vi.fn();
    const round = { skillId: 'factor-pairs' as const, prompt: 'p', totalWheels: 24, wheelsPerCar: 4 };
    render(<FactorPairsGame round={round} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '6' }));
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });
});
