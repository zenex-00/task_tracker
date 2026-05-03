'use client';

interface CellProgressBarProps {
  value: number;
  onChange?: (value: number) => void;
  cells?: number;
  ariaLabel: string;
  compact?: boolean;
}

function clampToStep(value: number, cells: number): number {
  const max = cells * 10;
  const bounded = Math.max(0, Math.min(max, value));
  return Math.round(bounded / 10) * 10;
}

export function CellProgressBar({ value, onChange, cells = 10, ariaLabel, compact = false }: CellProgressBarProps) {
  const normalized = clampToStep(value, cells);
  const activeCells = Math.round(normalized / 10);
  const interactive = Boolean(onChange);

  return (
    <div className={`cell-progress ${compact ? 'is-compact' : ''}`} role="group" aria-label={ariaLabel}>
      {Array.from({ length: cells }).map((_, index) => {
        const cellValue = (index + 1) * 10;
        const active = index < activeCells;
        return (
          <button
            key={`cell-${index}`}
            type="button"
            className={`cell-progress-cell ${active ? 'is-active' : ''} ${interactive ? 'is-interactive' : ''}`}
            onClick={interactive ? () => onChange?.(cellValue) : undefined}
            disabled={!interactive}
            aria-label={`${ariaLabel}: step ${index + 1} of ${cells}`}
            aria-pressed={interactive ? active : undefined}
          />
        );
      })}
    </div>
  );
}

