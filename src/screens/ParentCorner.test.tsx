import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParentCorner } from './ParentCorner';
import { AppStateProvider } from '../store/AppStateContext';
import { saveState } from '../storage/persistence';
import { createDefaultState } from '../storage/schema';

describe('ParentCorner', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('renders a heatmap cell per fact with its mastery class', () => {
    const state = createDefaultState();
    state.facts['2-2'] = { a: 2, b: 2, attempts: [], mastery: 'mastered', lastSeen: '2026-07-10' };
    saveState(state);

    render(
      <AppStateProvider>
        <ParentCorner onBack={vi.fn()} />
      </AppStateProvider>
    );

    expect(screen.getByTestId('fact-2-2')).toHaveClass('mastery-mastered');
    expect(screen.getByTestId('fact-2-3')).toHaveClass('mastery-unseen');
  });

  it('does not throw when exporting progress', async () => {
    render(
      <AppStateProvider>
        <ParentCorner onBack={vi.fn()} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('Export progress'));
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('calls onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    render(
      <AppStateProvider>
        <ParentCorner onBack={onBack} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
