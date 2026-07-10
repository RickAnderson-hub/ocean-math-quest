import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComboMeter } from './ComboMeter';

describe('ComboMeter', () => {
  it('shows no combo text at zero', () => {
    render(<ComboMeter combo={0} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--none');
    expect(screen.getByTestId('combo-meter').textContent).toBe('');
  });

  it('reaches the bubbles tier at 3', () => {
    render(<ComboMeter combo={3} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--bubbles');
  });

  it('reaches the glow tier at 6', () => {
    render(<ComboMeter combo={6} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--glow');
  });

  it('reaches the burst tier at 10 and shows the combo count', () => {
    render(<ComboMeter combo={10} />);
    expect(screen.getByTestId('combo-meter')).toHaveClass('combo-meter--burst');
    expect(screen.getByTestId('combo-meter').textContent).toBe('Combo: 10');
  });
});
