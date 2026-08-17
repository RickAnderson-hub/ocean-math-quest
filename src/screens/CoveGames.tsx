import { useState } from 'react';
import { ArrayGrid } from '../components/ArrayGrid';
import { WordProblemPicker } from '../components/WordProblemPicker';
import { TrueFalseCard } from '../components/TrueFalseCard';
import { GroupingBoard } from '../components/GroupingBoard';
import { NumberPad } from '../components/NumberPad';
import {
  AssociativeRound,
  BuildArrayRound,
  CommuteSolveRound,
  CommuteSpinRound,
  EquivalentFactsRound,
  FactorPairsRound,
  TrueFalseRound,
  WhenToMultiplyRound,
  checkAssociative,
  checkBuildArray,
  checkCommuteSolve,
  checkEquivalentFacts,
  checkFactorPairs,
  checkTrueFalse,
  checkWhenToMultiply,
} from '../engine/coveContent';

interface GameProps<T> {
  round: T;
  onSubmit: (correct: boolean) => void;
  disabled?: boolean;
}

export function WhenToMultiplyGame({ round, onSubmit, disabled }: GameProps<WhenToMultiplyRound>) {
  const options = [
    { id: 'multiply', label: round.multiplyExpression },
    { id: 'add', label: round.addExpression },
  ];
  return (
    <WordProblemPicker
      prompt={round.prompt}
      options={options}
      onSelect={id => onSubmit(checkWhenToMultiply(round, id as 'multiply' | 'add'))}
      disabled={disabled}
    />
  );
}

export function BuildArrayGame({ round, onSubmit, disabled }: GameProps<BuildArrayRound>) {
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">Build an array with {round.targetProduct} dots.</p>
      <ArrayGrid rows={rows} cols={cols} editable onRowsChange={setRows} onColsChange={setCols} />
      <button type="button" disabled={disabled} onClick={() => onSubmit(checkBuildArray(round, rows, cols))}>
        Check
      </button>
    </div>
  );
}

export function CommuteSpinGame({ round, onSubmit, disabled }: GameProps<CommuteSpinRound>) {
  const rotatedOption = { id: 'rotated', label: `${round.b} rows × ${round.a} columns` };
  const unrotatedOption = { id: 'unrotated', label: `${round.a} rows × ${round.b} columns` };
  const options = round.rotatedFirst ? [rotatedOption, unrotatedOption] : [unrotatedOption, rotatedOption];
  return (
    <div className="cove-game">
      <ArrayGrid rows={round.a} cols={round.b} />
      <WordProblemPicker
        prompt="If you spin this array a quarter turn, how many rows and columns will it have?"
        options={options}
        onSelect={id => onSubmit(id === 'rotated')}
        disabled={disabled}
      />
    </div>
  );
}

export function CommuteSolveGame({ round, onSubmit, disabled }: GameProps<CommuteSolveRound>) {
  const options = [
    { id: round.optionA.id, label: round.optionA.label },
    { id: round.optionB.id, label: round.optionB.label },
    { id: round.optionC.id, label: round.optionC.label },
  ];
  return (
    <WordProblemPicker
      prompt={round.prompt}
      options={options}
      onSelect={id => onSubmit(checkCommuteSolve(round, id))}
      disabled={disabled}
    />
  );
}

export function EquivalentFactsGame({ round, onSubmit, disabled }: GameProps<EquivalentFactsRound>) {
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">
        This array shows {round.a} × {round.b}. Build a different array with the same total.
      </p>
      <ArrayGrid rows={round.a} cols={round.b} />
      <ArrayGrid rows={rows} cols={cols} editable onRowsChange={setRows} onColsChange={setCols} />
      <button type="button" disabled={disabled} onClick={() => onSubmit(checkEquivalentFacts(round, rows, cols))}>
        Check
      </button>
    </div>
  );
}

export function TrueFalseGame({ round, onSubmit, disabled }: GameProps<TrueFalseRound>) {
  return (
    <TrueFalseCard
      statement={`${round.a} × ${round.b} = ${round.claimedProduct}`}
      onAnswer={answer => onSubmit(checkTrueFalse(round, answer))}
      disabled={disabled}
    />
  );
}

export function AssociativeGame({ round, onSubmit, disabled }: GameProps<AssociativeRound>) {
  const [value, setValue] = useState('');
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">Group them however you like — what's the total?</p>
      <GroupingBoard x={round.x} y={round.y} z={round.z} />
      <NumberPad
        value={value}
        onDigit={digit => setValue(v => v + digit)}
        onBackspace={() => setValue(v => v.slice(0, -1))}
        onSubmit={() => value !== '' && onSubmit(checkAssociative(round, Number(value)))}
        disabled={disabled}
      />
    </div>
  );
}

export function FactorPairsGame({ round, onSubmit, disabled }: GameProps<FactorPairsRound>) {
  const [value, setValue] = useState('');
  return (
    <div className="cove-game">
      <p className="cove-game__prompt">{round.prompt}</p>
      <NumberPad
        value={value}
        onDigit={digit => setValue(v => v + digit)}
        onBackspace={() => setValue(v => v.slice(0, -1))}
        onSubmit={() => value !== '' && onSubmit(checkFactorPairs(round, Number(value)))}
        disabled={disabled}
      />
    </div>
  );
}
