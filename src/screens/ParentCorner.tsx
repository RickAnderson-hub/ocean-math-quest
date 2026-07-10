import { useRef } from 'react';
import { factKeyFor, ZONES } from '../engine/zones';
import { useAppState } from '../store/AppStateContext';

interface ParentCornerProps {
  onBack: () => void;
}

const MULTIPLIERS = Array.from({ length: 11 }, (_, i) => i + 2);

export function ParentCorner({ onBack }: ParentCornerProps) {
  const { state, exportState, importState } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ocean-math-quest-progress.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importState(String(reader.result));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        window.alert('Could not import progress: ' + message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="parent-corner">
      <button type="button" onClick={onBack}>
        Back
      </button>
      <table data-testid="mastery-heatmap">
        <thead>
          <tr>
            <th />
            {MULTIPLIERS.map(b => (
              <th key={b}>{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ZONES.map(zone => (
            <tr key={zone.table}>
              <th>{zone.table}</th>
              {MULTIPLIERS.map(b => {
                const key = factKeyFor(zone.table, b);
                const mastery = state.facts[key]?.mastery ?? 'unseen';
                return (
                  <td key={b} data-testid={`fact-${zone.table}-${b}`} className={`mastery-${mastery}`}>
                    {mastery[0].toUpperCase()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={handleExport}>
        Export progress
      </button>
      <button type="button" onClick={handleImportClick}>
        Import progress
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="import-file-input"
      />
    </div>
  );
}
