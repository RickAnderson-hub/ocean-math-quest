import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrayGrid } from './ArrayGrid';

describe('ArrayGrid', () => {
  it('renders one row element per row, each containing `cols` dots', () => {
    render(<ArrayGrid rows={3} cols={4} />);
    expect(screen.getByTestId('array-grid-row-0').children).toHaveLength(4);
    expect(screen.getByTestId('array-grid-row-2').children).toHaveLength(4);
    expect(screen.queryByTestId('array-grid-row-3')).toBeNull();
  });

  it('shows the multiplication sentence by default', () => {
    render(<ArrayGrid rows={3} cols={4} />);
    expect(screen.getByTestId('array-grid-sentence')).toHaveTextContent('3 × 4 = 12');
  });

  it('hides the sentence when showSentence is false', () => {
    render(<ArrayGrid rows={3} cols={4} showSentence={false} />);
    expect(screen.queryByTestId('array-grid-sentence')).toBeNull();
  });

  it('has no stepper controls when not editable', () => {
    render(<ArrayGrid rows={2} cols={2} />);
    expect(screen.queryByTestId('array-grid-rows-control')).toBeNull();
  });

  it('calls onRowsChange/onColsChange from the steppers, clamped to [1, maxSize]', async () => {
    const onRowsChange = vi.fn();
    const onColsChange = vi.fn();
    render(
      <ArrayGrid rows={10} cols={1} editable maxSize={10} onRowsChange={onRowsChange} onColsChange={onColsChange} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'more rows' }));
    expect(onRowsChange).toHaveBeenCalledWith(10); // clamped, was already at maxSize
    await userEvent.click(screen.getByRole('button', { name: 'fewer columns' }));
    expect(onColsChange).toHaveBeenCalledWith(1); // clamped, was already at minimum
  });
});
