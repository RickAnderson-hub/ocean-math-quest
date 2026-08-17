import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupingBoard } from './GroupingBoard';

describe('GroupingBoard', () => {
  it('renders both bracketings of x, y, z', () => {
    render(<GroupingBoard x={2} y={3} z={4} />);
    expect(screen.getByTestId('grouping-board-left')).toHaveTextContent('(2 × 3) × 4');
    expect(screen.getByTestId('grouping-board-right')).toHaveTextContent('2 × (3 × 4)');
  });
});
