import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrueFalseCard } from './TrueFalseCard';

describe('TrueFalseCard', () => {
  it('renders the statement', () => {
    render(<TrueFalseCard statement="7 × 4 = 30" onAnswer={vi.fn()} />);
    expect(screen.getByTestId('true-false-statement')).toHaveTextContent('7 × 4 = 30');
  });

  it('calls onAnswer(true) and onAnswer(false) from the respective buttons', async () => {
    const onAnswer = vi.fn();
    render(<TrueFalseCard statement="s" onAnswer={onAnswer} />);
    await userEvent.click(screen.getByTestId('true-false-true'));
    expect(onAnswer).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByTestId('true-false-false'));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('disables both buttons when disabled is true', () => {
    render(<TrueFalseCard statement="s" onAnswer={vi.fn()} disabled />);
    expect(screen.getByTestId('true-false-true')).toBeDisabled();
    expect(screen.getByTestId('true-false-false')).toBeDisabled();
  });
});
