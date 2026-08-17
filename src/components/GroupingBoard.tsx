import './GroupingBoard.css';

interface GroupingBoardProps {
  x: number;
  y: number;
  z: number;
}

export function GroupingBoard({ x, y, z }: GroupingBoardProps) {
  return (
    <div className="grouping-board">
      <p className="grouping-board__expression" data-testid="grouping-board-left">
        ({x} × {y}) × {z}
      </p>
      <p className="grouping-board__equals">=</p>
      <p className="grouping-board__expression" data-testid="grouping-board-right">
        {x} × ({y} × {z})
      </p>
    </div>
  );
}
