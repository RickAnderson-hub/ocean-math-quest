import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, SessionSummary } from '../storage/schema';
import { exportStateJson, importStateJson, loadState, saveState } from '../storage/persistence';
import { recordAttempt } from '../engine/masteryEngine';
import { factKeyFor } from '../engine/zones';
import { Attempt, FactState } from '../engine/types';

interface AppStateContextValue {
  state: AppState;
  recordFactAttempt: (a: number, b: number, attempt: Attempt) => void;
  addSession: (summary: SessionSummary) => void;
  exportState: () => string;
  importState: (json: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  function recordFactAttempt(a: number, b: number, attempt: Attempt) {
    setState(prev => {
      const key = factKeyFor(a, b);
      const existing: FactState = prev.facts[key] ?? {
        a: Math.min(a, b),
        b: Math.max(a, b),
        attempts: [],
        mastery: 'unseen',
        lastSeen: null,
      };
      const updated = recordAttempt(existing, attempt);
      return { ...prev, facts: { ...prev.facts, [key]: updated } };
    });
  }

  function addSession(summary: SessionSummary) {
    setState(prev => ({ ...prev, sessions: [...prev.sessions, summary].slice(-50) }));
  }

  function exportState(): string {
    return exportStateJson(state);
  }

  function importState(json: string) {
    setState(importStateJson(json));
  }

  return (
    <AppStateContext.Provider value={{ state, recordFactAttempt, addSession, exportState, importState }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
