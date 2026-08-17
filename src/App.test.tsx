import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { saveState } from './storage/persistence';
import { createDefaultState } from './storage/schema';
import { CONCEPT_SKILL_IDS } from './engine/coveEngine';

function seedGateExemptSave() {
  const state = createDefaultState();
  state.coveGateExempt = true;
  saveState(state);
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the journey map showing the first zone', () => {
    render(<App />);
    expect(screen.getByText('Sunlit Reef (2s)')).toBeInTheDocument();
  });

  it('navigates to the drill screen when a table zone Play is clicked, on a gate-exempt save', async () => {
    seedGateExemptSave();
    render(<App />);
    await userEvent.click(within(screen.getByTestId('zone-2')).getByText('Play'));
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('navigates to the parent corner when the gear icon is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'parent corner' }));
    expect(screen.getByTestId('mastery-heatmap')).toBeInTheDocument();
  });

  it('navigates from the map into Arrays Cove, completes a session, and returns to the map', () => {
    vi.useFakeTimers();
    // Seed a save where every cove skill but one is already mastered, so a
    // 10-round session is a single repeated question type (mirrors the
    // seeding approach in CoveScreen.test.tsx from Task 9). App.tsx doesn't
    // expose CoveScreen's rng prop, so this relies on the default Math.random
    // — every round is 'when-to-multiply' regardless of its random
    // correctChoice, and this test doesn't assert on correctness, only on
    // screen transitions.
    const state = createDefaultState();
    for (const id of CONCEPT_SKILL_IDS) {
      if (id === 'when-to-multiply') continue;
      state.coveSkills[id] = { recentCorrect: [true, true, true, true, true], mastered: true };
    }
    saveState(state);

    render(<App />);
    fireEvent.click(within(screen.getByTestId('zone-arrays-cove')).getByText('Play'));
    expect(screen.getByTestId('cove-progress')).toBeInTheDocument();

    for (let round = 0; round < 10; round++) {
      fireEvent.click(screen.getByTestId('word-problem-option-multiply'));
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(screen.getByTestId('score')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back to map'));
    expect(screen.getByText('Sunlit Reef (2s)')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
