import './ArrayGrid.css';

interface ArrayGridProps {
  rows: number;
  cols: number;
  maxSize?: number;
  editable?: boolean;
  onRowsChange?: (rows: number) => void;
  onColsChange?: (cols: number) => void;
  showSentence?: boolean;
}

export function ArrayGrid({
  rows,
  cols,
  maxSize = 10,
  editable = false,
  onRowsChange,
  onColsChange,
  showSentence = true,
}: ArrayGridProps) {
  const rowIndices = Array.from({ length: rows }, (_, r) => r);
  const colIndices = Array.from({ length: cols }, (_, c) => c);

  return (
    <div className="array-grid">
      {editable && (
        <div className="array-grid__control" data-testid="array-grid-rows-control">
          <button type="button" onClick={() => onRowsChange?.(Math.max(1, rows - 1))} aria-label="fewer rows">
            −
          </button>
          <span>{rows} rows</span>
          <button type="button" onClick={() => onRowsChange?.(Math.min(maxSize, rows + 1))} aria-label="more rows">
            +
          </button>
        </div>
      )}
      <div className="array-grid__grid" data-testid="array-grid-dots">
        {rowIndices.map(r => (
          <div key={r} className="array-grid__row" data-testid={`array-grid-row-${r}`}>
            {colIndices.map(c => (
              <span key={c} className="array-grid__dot" />
            ))}
          </div>
        ))}
      </div>
      {editable && (
        <div className="array-grid__control" data-testid="array-grid-cols-control">
          <button type="button" onClick={() => onColsChange?.(Math.max(1, cols - 1))} aria-label="fewer columns">
            −
          </button>
          <span>{cols} columns</span>
          <button type="button" onClick={() => onColsChange?.(Math.min(maxSize, cols + 1))} aria-label="more columns">
            +
          </button>
        </div>
      )}
      {showSentence && (
        <p className="array-grid__sentence" data-testid="array-grid-sentence">
          {rows} × {cols} = {rows * cols}
        </p>
      )}
    </div>
  );
}
