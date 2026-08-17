import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JourneyMap } from './JourneyMap';
import { AppStateProvider } from '../store/AppStateContext';
import { saveState } from '../storage/persistence';
import { createDefaultState } from '../storage/schema';
import { CONCEPT_SKILL_IDS } from '../engine/coveEngine';

function seedGateExemptSave() {
  const state = createDefaultState();
  state.coveGateExempt = true;
  saveState(state);
}

function seedFullyMasteredCoveSave() {
  const state = createDefaultState();
  for (const id of CONCEPT_SKILL_IDS) {
    state.coveSkills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
  }
  saveState(state);
}

describe('JourneyMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows a Play button for the current (first) table zone and Locked for later ones, on a gate-exempt save', () => {
    seedGateExemptSave();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(within(screen.getByTestId('zone-2')).getByText('Play')).toBeInTheDocument();
    expect(within(screen.getByTestId('zone-3')).getByText('Locked')).toBeInTheDocument();
  });

  it('calls onPlay with the table number when a table zone Play is clicked, on a gate-exempt save', async () => {
    seedGateExemptSave();
    const onPlay = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={onPlay} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    await userEvent.click(within(screen.getByTestId('zone-2')).getByText('Play'));
    expect(onPlay).toHaveBeenCalledWith(2);
  });

  it('calls onOpenParentCorner when the gear icon is clicked', async () => {
    const onOpenParentCorner = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={onOpenParentCorner} />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(onOpenParentCorner).toHaveBeenCalledTimes(1);
  });

  it('renders an Arrays Cove pin and calls onPlayCove when its Play button is clicked', async () => {
    const onPlayCove = vi.fn();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={onPlayCove} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('zone-arrays-cove')).toBeInTheDocument();
    await userEvent.click(within(screen.getByTestId('zone-arrays-cove')).getByText('Play'));
    expect(onPlayCove).toHaveBeenCalledTimes(1);
  });

  it('locks every table zone when the cove is unmastered and the save is not gate-exempt', () => {
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('zone-2')).toHaveClass('dive-node--locked');
  });

  it('leaves table zones unlocked for a gate-exempt save even with an unmastered cove', () => {
    seedGateExemptSave();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('zone-2')).not.toHaveClass('dive-node--locked');
  });

  it('unlocks table zones once every cove skill is actually mastered', () => {
    seedFullyMasteredCoveSave();
    render(
      <AppStateProvider>
        <JourneyMap onPlay={vi.fn()} onPlayCove={vi.fn()} onOpenParentCorner={vi.fn()} />
      </AppStateProvider>
    );
    expect(screen.getByTestId('zone-2')).not.toHaveClass('dive-node--locked');
    expect(within(screen.getByTestId('zone-arrays-cove')).getByText('Replay')).toBeInTheDocument();
    expect(within(screen.getByTestId('zone-arrays-cove')).getByTestId('cove-badge')).toBeInTheDocument();
  });
});
