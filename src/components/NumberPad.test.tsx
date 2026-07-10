import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberPad } from './NumberPad';

describe('NumberPad', () => {
  it('calls onDigit with the clicked digit', async () => {
    const onDigit = vi.fn();
    render(<NumberPad value="" onDigit={onDigit} onBackspace={vi.fn()} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    expect(onDigit).toHaveBeenCalledWith('7');
  });

  it('calls onBackspace when backspace is clicked', async () => {
    const onBackspace = vi.fn();
    render(<NumberPad value="12" onDigit={vi.fn()} onBackspace={onBackspace} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'backspace' }));
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when submit is clicked', async () => {
    const onSubmit = vi.fn();
    render(<NumberPad value="12" onDigit={vi.fn()} onBackspace={vi.fn()} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables all buttons when disabled is true', () => {
    render(<NumberPad value="" onDigit={vi.fn()} onBackspace={vi.fn()} onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'submit' })).toBeDisabled();
  });

  it('displays the current value', () => {
    render(<NumberPad value="42" onDigit={vi.fn()} onBackspace={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('number-pad-display')).toHaveTextContent('42');
  });
});
