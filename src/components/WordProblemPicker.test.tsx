import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordProblemPicker } from './WordProblemPicker';

describe('WordProblemPicker', () => {
  const options = [
    { id: 'multiply', label: '3 × 4' },
    { id: 'add', label: '3 + 4' },
  ];

  it('renders the prompt and one button per option', () => {
    render(<WordProblemPicker prompt="How many in all?" options={options} onSelect={vi.fn()} />);
    expect(screen.getByTestId('word-problem-prompt')).toHaveTextContent('How many in all?');
    expect(screen.getByTestId('word-problem-option-multiply')).toHaveTextContent('3 × 4');
    expect(screen.getByTestId('word-problem-option-add')).toHaveTextContent('3 + 4');
  });

  it('calls onSelect with the clicked option id', async () => {
    const onSelect = vi.fn();
    render(<WordProblemPicker prompt="p" options={options} onSelect={onSelect} />);
    await userEvent.click(screen.getByTestId('word-problem-option-add'));
    expect(onSelect).toHaveBeenCalledWith('add');
  });

  it('disables all options when disabled is true', () => {
    render(<WordProblemPicker prompt="p" options={options} onSelect={vi.fn()} disabled />);
    expect(screen.getByTestId('word-problem-option-multiply')).toBeDisabled();
  });
});
