import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JourneyMap } from './JourneyMap';
import { AppStateProvider } from '../store/AppStateContext';

describe('JourneyMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows a Play button for the current (first) zone and Locked for later ones', () => {
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(within(screen.getByTestId('zone-2')).getByText('Play')).toBeInTheDocument();
    expect(within(screen.getByTestId('zone-3')).getByText('Locked')).toBeInTheDocument();
  });

  it('calls onPlay with the table number when Play is clicked', async () => {
    const onPlay = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={onPlay} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    await userEvent.click(within(screen.getByTestId('zone-2')).getByText('Play'));
    expect(onPlay).toHaveBeenCalledWith(2);
  });

  it('calls onOpenParentCorner when the gear icon is clicked', async () => {
    const onOpenParentCorner = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onOpenParentCorner={onOpenParentCorner} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(onOpenParentCorner).toHaveBeenCalledTimes(1);
  });
});
