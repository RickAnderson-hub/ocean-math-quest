import { useState } from 'react';
import { AppStateProvider } from './store/AppStateContext';
import { JourneyMap } from './screens/JourneyMap';
import { CoveScreen } from './screens/CoveScreen';
import { CoveSessionResults } from './screens/CoveSessionResults';
import { DrillScreen } from './screens/DrillScreen';
import { SessionResults } from './screens/SessionResults';
import { ParentCorner } from './screens/ParentCorner';
import { CoveSessionSummary, SessionSummary } from './storage/schema';

type Screen =
  | { name: 'map' }
  | { name: 'cove' }
  | { name: 'cove-results'; summary: CoveSessionSummary }
  | { name: 'drill'; table: number }
  | { name: 'results'; summary: SessionSummary }
  | { name: 'parent' };

function AppShell() {
  const [screen, setScreen] = useState<Screen>({ name: 'map' });

  switch (screen.name) {
    case 'map':
      return (
        <JourneyMap
          onPlay={table => setScreen({ name: 'drill', table })}
          onPlayCove={() => setScreen({ name: 'cove' })}
          onOpenParentCorner={() => setScreen({ name: 'parent' })}
        />
      );
    case 'cove':
      return <CoveScreen onComplete={summary => setScreen({ name: 'cove-results', summary })} />;
    case 'cove-results':
      return (
        <CoveSessionResults
          summary={screen.summary}
          onPlayAgain={() => setScreen({ name: 'cove' })}
          onHome={() => setScreen({ name: 'map' })}
        />
      );
    case 'drill':
      return (
        <DrillScreen
          key={screen.table}
          table={screen.table}
          onComplete={summary => setScreen({ name: 'results', summary })}
        />
      );
    case 'results':
      return (
        <SessionResults
          summary={screen.summary}
          onPlayAgain={() => setScreen({ name: 'drill', table: screen.summary.table })}
          onHome={() => setScreen({ name: 'map' })}
        />
      );
    case 'parent':
      return <ParentCorner onBack={() => setScreen({ name: 'map' })} />;
  }
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
