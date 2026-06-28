'use client';

import { type CalendarCell, WEEKDAY_LABELS, buildMonthGrid } from '@/lib/time/calendar';
import { cn } from '@/lib/utils';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface CalendarProps {
  /** Currently selected date, ISO 'YYYY-MM-DD'. */
  value: string;
  /** Today in the home zone, ISO 'YYYY-MM-DD' — used for the today marker + Today button. */
  today: string;
  onSelect: (iso: string) => void;
}

function parseYearMonth(iso: string): { year: number; month: number } {
  const dt = DateTime.fromISO(iso);
  const valid = dt.isValid ? dt : DateTime.now();
  return { year: valid.year, month: valid.month };
}

/**
 * Self-contained month-grid date picker. All date math goes through Luxon
 * (`buildMonthGrid`); rendering is fully token-driven so it's identical across
 * browsers and inherits dark mode. Selection, today, and weekend are distinct
 * visual states layered on each day cell.
 */
export function Calendar({ value, today, onSelect }: CalendarProps) {
  const [view, setView] = useState(() => parseYearMonth(value || today));

  const cells = buildMonthGrid(view.year, view.month);
  const headerLabel = DateTime.fromObject({ year: view.year, month: view.month }).toFormat(
    'MMMM yyyy',
  );

  function shiftMonth(delta: number) {
    const dt = DateTime.fromObject({ year: view.year, month: view.month }).plus({ months: delta });
    setView({ year: dt.year, month: dt.month });
  }

  function handleToday() {
    setView(parseYearMonth(today));
    onSelect(today);
  }

  return (
    <div className="w-[252px] select-none">
      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between">
        <NavButton label="Previous month" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="size-4" />
        </NavButton>
        <span className="text-[13px] font-medium text-[color:var(--fg)]">{headerLabel}</span>
        <NavButton label="Next month" onClick={() => shiftMonth(1)}>
          <ChevronRight className="size-4" />
        </NavButton>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-7 items-center justify-center text-[11px] font-medium text-[color:var(--fg-muted)]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => (
          <DayCell
            key={cell.iso}
            cell={cell}
            selected={cell.iso === value}
            isToday={cell.iso === today}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-2 flex justify-center border-t border-border pt-2">
        <button
          type="button"
          onClick={handleToday}
          className="rounded-[var(--radius)] px-2.5 py-1 text-[12px] font-medium text-[color:var(--brand)] transition-colors hover:bg-[var(--hover)]"
        >
          Today
        </button>
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-[var(--radius)] text-[color:var(--fg-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[color:var(--fg)]"
    >
      {children}
    </button>
  );
}

function DayCell({
  cell,
  selected,
  isToday,
  onSelect,
}: {
  cell: CalendarCell;
  selected: boolean;
  isToday: boolean;
  onSelect: (iso: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(cell.iso)}
      aria-pressed={selected}
      className={cn(
        'flex h-8 items-center justify-center rounded-[var(--radius)] font-mono text-[13px] tabular-nums transition-colors',
        selected
          ? 'bg-[var(--brand)] text-[color:var(--brand-fg)]'
          : 'hover:bg-[var(--hover)] text-[color:var(--fg)]',
        // Today, not selected: ring marker so it reads distinctly from selection.
        !selected && isToday && 'ring-1 ring-[var(--brand)] ring-inset',
        // Weekend tint (only when not selected — selection wins).
        !selected &&
          cell.isWeekend &&
          'text-[color:color-mix(in_oklab,var(--band-weekend)_70%,var(--fg))]',
        // Out-of-month spill: muted, regardless of weekend.
        !selected && !cell.inMonth && 'text-[color:var(--fg-subtle)]',
      )}
    >
      {cell.day}
    </button>
  );
}
