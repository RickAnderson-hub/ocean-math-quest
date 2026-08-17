import { useRef } from 'react';
import { factKeyFor, ZONES } from '../engine/zones';
import { useAppState } from '../store/AppStateContext';
import { CONCEPT_SKILL_IDS } from '../engine/coveEngine';
import { ConceptSkillId } from '../engine/types';
import './ParentCorner.css';

interface ParentCornerProps {
  onBack: () => void;
}

const MULTIPLIERS = Array.from({ length: 11 }, (_, i) => i + 2);

const SKILL_LABELS: Record<ConceptSkillId, string> = {
  'when-to-multiply': 'When to Multiply',
  'build-array': 'Build an Array',
  'commute-spin': 'Spin to Commute',
  'commute-solve': 'Commute & Solve',
  'equivalent-facts': 'Equivalent Facts',
  'true-false': 'True or False',
  associative: 'Regroup the Crates',
  'factor-pairs': 'How Many Wheels?',
};

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
      <div className="parent-corner__topbar">
        <button type="button" className="parent-corner__back" onClick={onBack}>
          Back
        </button>
        <h1 className="parent-corner__title">Parent Corner</h1>
      </div>

      <p className="parent-corner__hint">
        Each cell shows how well a fact is known: <strong>U</strong>nseen, <strong>L</strong>earning,{' '}
        <strong>K</strong>nown, <strong>M</strong>astered.
      </p>

      <div className="parent-corner__cove-progress" data-testid="cove-progress-panel">
        <h2 className="parent-corner__subheading">Arrays Cove</h2>
        <ul className="parent-corner__cove-skill-list">
          {CONCEPT_SKILL_IDS.map(id => (
            <li
              key={id}
              data-testid={`cove-skill-${id}`}
              className={state.coveSkills[id].mastered ? 'cove-skill--mastered' : 'cove-skill--in-progress'}
            >
              {SKILL_LABELS[id]}: {state.coveSkills[id].mastered ? 'Mastered' : 'In progress'}
            </li>
          ))}
        </ul>
      </div>

      <div className="parent-corner__table-wrap">
        <table className="parent-corner__table" data-testid="mastery-heatmap">
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
      </div>

      <div className="parent-corner__actions">
        <button type="button" className="parent-corner__action" onClick={handleExport}>
          Export progress
        </button>
        <button type="button" className="parent-corner__action" onClick={handleImportClick}>
          Import progress
        </button>
      </div>
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
