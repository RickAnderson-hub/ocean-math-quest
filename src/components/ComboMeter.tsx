import './ComboMeter.css';

interface ComboMeterProps {
  combo: number;
}

type Tier = 'none' | 'bubbles' | 'glow' | 'burst';

function tierFor(combo: number): Tier {
  if (combo >= 10) return 'burst';
  if (combo >= 6) return 'glow';
  if (combo >= 3) return 'bubbles';
  return 'none';
}

export function ComboMeter({ combo }: ComboMeterProps) {
  const tier = tierFor(combo);
  return (
    <div className={`combo-meter combo-meter--${tier}`} data-testid="combo-meter">
      {combo > 0 ? `Combo: ${combo}` : ''}
    </div>
  );
}
