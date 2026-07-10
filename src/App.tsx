import { useState } from 'react';
import { AppStateProvider } from './store/AppStateContext';
import { JourneyMap } from './screens/JourneyMap';
import { DrillScreen } from './screens/DrillScreen';
import { SessionResults } from './screens/SessionResults';
import { ParentCorner } from './screens/ParentCorner';
import { SessionSummary } from './storage/schema';

type Screen =
  | { name: 'map' }
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
          onOpenParentCorner={() => setScreen({ name: 'parent' })}
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
