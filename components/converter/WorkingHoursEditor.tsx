'use client';

import { useConverterStore } from '@/lib/store/converter';
import type { TimeFormat } from '@/lib/time/format';
import { cn } from '@/lib/utils';

function formatHourLabel(hour: number, format: TimeFormat): string {
  if (format === '24') return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12:00 am';
  if (hour === 12) return '12:00 pm';
  if (hour < 12) return `${hour}:00 am`;
  return `${hour - 12}:00 pm`;
}

const DAYS: Array<{ idx: number; name: string }> = [
  { idx: 1, name: 'M' },
  { idx: 2, name: 'T' },
  { idx: 3, name: 'W' },
  { idx: 4, name: 'T' },
  { idx: 5, name: 'F' },
  { idx: 6, name: 'S' },
  { idx: 7, name: 'S' },
];

export function WorkingHoursEditor() {
  const wh = useConverterStore((s) => s.workingHours);
  const setWorkingHours = useConverterStore((s) => s.setWorkingHours);
  const format = useConverterStore((s) => s.format);

  const invalid = wh.start >= wh.end;

  function setStart(v: number) {
    if (v >= wh.end) return;
    setWorkingHours({ ...wh, start: v });
  }

  function setEnd(v: number) {
    if (v <= wh.start) return;
    setWorkingHours({ ...wh, end: v });
  }

  function toggleDay(idx: number) {
    const next = wh.days.includes(idx)
      ? wh.days.filter((x) => x !== idx)
      : [...wh.days, idx].sort((a, b) => a - b);
    setWorkingHours({ ...wh, days: next });
  }

  return (
    <div className="mt-2.5 space-y-2.5 rounded-[var(--radius)] border border-[color:var(--border)] bg-[var(--surface-2,var(--card))] p-2.5">
      <div className="flex items-center gap-2 text-[12px]">
        <span className="w-9 text-[color:var(--fg-muted)]">Hours</span>
        <HourSelect value={wh.start} onChange={setStart} max={wh.end - 1} format={format} />
        <span className="text-[color:var(--fg-subtle)]">–</span>
        <HourSelect value={wh.end} onChange={setEnd} min={wh.start + 1} format={format} />
      </div>

      <div className="flex items-center gap-2 text-[12px]">
        <span className="w-9 shrink-0 text-[color:var(--fg-muted)]">Days</span>
        <div className="flex flex-1 gap-1">
          {DAYS.map((d) => {
            const on = wh.days.includes(d.idx);
            return (
              <button
                key={d.idx}
                type="button"
                onClick={() => toggleDay(d.idx)}
                aria-pressed={on}
                aria-label={`Day ${d.idx}`}
                className={cn(
                  'h-6 flex-1 rounded-[3px] border font-mono text-[11px] transition-colors',
                  on
                    ? 'border-[color:var(--brand)] bg-[var(--brand)] text-[color:var(--brand-fg)]'
                    : 'border-[color:var(--border)] bg-card text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
                )}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      </div>

      {invalid && (
        <p className="text-[11px] text-[color:hsl(var(--destructive))]">Start must be before end</p>
      )}
    </div>
  );
}

function HourSelect({
  value,
  onChange,
  format,
  min = 0,
  max = 23,
}: {
  value: number;
  onChange: (v: number) => void;
  format: TimeFormat;
  min?: number;
  max?: number;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
      className="h-7 flex-1 rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-1.5 font-mono text-[12px]"
    >
      {Array.from({ length: 24 }, (_, h) => h)
        .filter((h) => h >= min && h <= max)
        .map((h) => (
          <option key={`hour-${h}`} value={h}>
            {formatHourLabel(h, format)}
          </option>
        ))}
    </select>
  );
}
