'use client';

// Mini month calendar for override mode — pick which week to adjust. Selection is
// by WEEK (a row); the chosen week's Sunday becomes the override anchor. Past
// weeks (entirely before the current week) aren't selectable. Reuses
// buildMonthGrid (lib/time/calendar.ts) so we don't re-derive month layout.

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { buildMonthGrid, WEEKDAY_LABELS } from '@/lib/time/calendar';
import { DateTime } from '@/lib/time/luxon';
import { cn } from '@/lib/utils';

interface Props {
  value: string; // selected week's Sunday, 'YYYY-MM-DD'
  floor: string; // current week's Sunday — earlier weeks are disabled
  onSelect: (sundayAnchor: string) => void;
}

export function WeekPicker({ value, floor, onSelect }: Props) {
  const [month, setMonth] = useState(() => {
    const d = DateTime.fromISO(value);
    return { year: d.year, month: d.month };
  });

  const cells = buildMonthGrid(month.year, month.month);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const shift = (delta: number) => {
    const d = DateTime.fromObject({ year: month.year, month: month.month, day: 1 }).plus({
      months: delta,
    });
    setMonth({ year: d.year, month: d.month });
  };

  return (
    <div className="w-60 rounded-md border border-border bg-[hsl(var(--popover))] p-2 shadow-md">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shift(-1)}
          className="inline-flex size-6 items-center justify-center rounded hover:bg-[var(--hover)]"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-semibold">
          {DateTime.fromObject({ year: month.year, month: month.month }).toFormat('MMMM yyyy')}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shift(1)}
          className="inline-flex size-6 items-center justify-center rounded hover:bg-[var(--hover)]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center font-mono text-[9px] text-muted-foreground">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d.charAt(0)}</span>
        ))}
      </div>

      {rows.map((row) => {
        const sunday = row[0]?.iso ?? '';
        const disabled = sunday < floor;
        const selected = sunday === value;
        return (
          <button
            type="button"
            key={sunday}
            disabled={disabled}
            onClick={() => onSelect(sunday)}
            className={cn(
              'grid w-full grid-cols-7 rounded text-center text-[11px]',
              disabled ? 'opacity-30' : 'hover:bg-[var(--hover)]',
              selected && 'bg-[var(--brand-soft)]',
            )}
          >
            {row.map((cell) => (
              <span
                key={cell.iso}
                className={cn(
                  'py-0.5',
                  !cell.inMonth && 'text-muted-foreground/50',
                  cell.isWeekend && 'text-[var(--weekend-fg)]',
                )}
              >
                {cell.day}
              </span>
            ))}
          </button>
        );
      })}
    </div>
  );
}
