import './TrueFalseCard.css';

interface TrueFalseCardProps {
  statement: string;
  onAnswer: (answer: boolean) => void;
  disabled?: boolean;
}

export function TrueFalseCard({ statement, onAnswer, disabled = false }: TrueFalseCardProps) {
  return (
    <div className="true-false-card">
      <p className="true-false-card__statement" data-testid="true-false-statement">
        {statement}
      </p>
      <div className="true-false-card__actions">
        <button type="button" disabled={disabled} onClick={() => onAnswer(true)} data-testid="true-false-true">
          True
        </button>
        <button type="button" disabled={disabled} onClick={() => onAnswer(false)} data-testid="true-false-false">
          False
        </button>
      </div>
    </div>
  );
}
