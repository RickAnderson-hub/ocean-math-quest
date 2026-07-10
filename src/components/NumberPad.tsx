interface NumberPadProps {
  value: string;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function NumberPad({ value, onDigit, onBackspace, onSubmit, disabled = false }: NumberPadProps) {
  return (
    <div className="number-pad">
      <div className="number-pad-display" data-testid="number-pad-display">
        {value || ' '}
      </div>
      <div className="number-pad-grid">
        {DIGITS.map(digit => (
          <button key={digit} type="button" disabled={disabled} onClick={() => onDigit(digit)}>
            {digit}
          </button>
        ))}
        <button type="button" disabled={disabled} onClick={onBackspace} aria-label="backspace">
          ⌫
        </button>
        <button type="button" disabled={disabled} onClick={onSubmit} aria-label="submit">
          ✓
        </button>
      </div>
    </div>
  );
}
