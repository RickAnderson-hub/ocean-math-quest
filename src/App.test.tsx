import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the journey map showing the first zone', () => {
    render(<App />);
    expect(screen.getByText('Sunlit Reef (2s)')).toBeInTheDocument();
  });

  it('navigates to the drill screen when Play is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('Play'));
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('navigates to the parent corner when the gear icon is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(screen.getByTestId('mastery-heatmap')).toBeInTheDocument();
  });
});
