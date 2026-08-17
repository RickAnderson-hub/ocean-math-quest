import './WordProblemPicker.css';

export interface WordProblemPickerOption {
  id: string;
  label: string;
}

interface WordProblemPickerProps {
  prompt: string;
  options: WordProblemPickerOption[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  disabled?: boolean;
}

export function WordProblemPicker({
  prompt,
  options,
  onSelect,
  selectedId = null,
  disabled = false,
}: WordProblemPickerProps) {
  return (
    <div className="word-problem-picker">
      <p className="word-problem-picker__prompt" data-testid="word-problem-prompt">
        {prompt}
      </p>
      <div className="word-problem-picker__options">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            className={`word-problem-picker__option ${
              selectedId === option.id ? 'word-problem-picker__option--selected' : ''
            }`}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            data-testid={`word-problem-option-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
