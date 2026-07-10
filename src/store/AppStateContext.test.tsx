import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppStateProvider, useAppState } from './AppStateContext';
import { loadState } from '../storage/persistence';

function TestConsumer() {
  const { state, recordFactAttempt, addSession } = useAppState();
  return (
    <div>
      <span data-testid="mastery">{state.facts['3-4']?.mastery ?? 'unseen'}</span>
      <button
        onClick={() => recordFactAttempt(3, 4, { date: '2026-07-10', ms: 1000, correct: true })}
      >
        record
      </button>
      <button
        onClick={() =>
          addSession({ date: '2026-07-10', table: 3, stars: 3, cardsCorrect: 20, cardsTotal: 20, newlyMastered: [] })
        }
      >
        addSession
      </button>
      <span data-testid="sessionCount">{state.sessions.length}</span>
    </div>
  );
}

describe('AppStateContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts from the persisted default state', () => {
    render(
      <AppStateProvider>
        <TestConsumer />
      </AppStateProvider>
    );
    expect(screen.getByTestId('mastery')).toHaveTextContent('unseen');
  });

  it('recordFactAttempt updates state and persists to localStorage', async () => {
    render(
      <AppStateProvider>
        <TestConsumer />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('record'));
    expect(screen.getByTestId('mastery')).toHaveTextContent('known');
    expect(loadState().facts['3-4'].mastery).toBe('known');
  });

  it('addSession appends to session history and persists', async () => {
    render(
      <AppStateProvider>
        <TestConsumer />
      </AppStateProvider>
    );
    await userEvent.click(screen.getByText('addSession'));
    expect(screen.getByTestId('sessionCount')).toHaveTextContent('1');
    expect(loadState().sessions).toHaveLength(1);
  });
});
