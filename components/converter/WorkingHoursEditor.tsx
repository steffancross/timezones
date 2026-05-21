'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useConverterStore } from '@/lib/store/converter';
import { cn } from '@/lib/utils';
import type { WorkingHours } from '@/lib/time/working-hours';

const DAYS: Array<{ idx: number; name: string }> = [
  { idx: 1, name: 'Mon' },
  { idx: 2, name: 'Tue' },
  { idx: 3, name: 'Wed' },
  { idx: 4, name: 'Thu' },
  { idx: 5, name: 'Fri' },
  { idx: 6, name: 'Sat' },
  { idx: 7, name: 'Sun' },
];

interface Props {
  onClose: () => void;
}

export function WorkingHoursEditor({ onClose }: Props) {
  const current = useConverterStore((s) => s.workingHours);
  const setWorkingHours = useConverterStore((s) => s.setWorkingHours);

  const [draft, setDraft] = useState<WorkingHours>(current);

  function toggleDay(idx: number) {
    setDraft((d) => ({
      ...d,
      days: d.days.includes(idx)
        ? d.days.filter((x) => x !== idx)
        : [...d.days, idx].sort((a, b) => a - b),
    }));
  }

  const invalid = draft.start >= draft.end;

  function save() {
    if (invalid) return;
    setWorkingHours(draft);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Working hours</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Label className="w-16 text-sm">Start</Label>
            <HourSelect
              value={draft.start}
              onChange={(v) => setDraft((d) => ({ ...d, start: v }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <Label className="w-16 text-sm">End</Label>
            <HourSelect
              value={draft.end}
              onChange={(v) => setDraft((d) => ({ ...d, end: v }))}
            />
          </div>

          <div>
            <Label className="text-sm">Days</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = draft.days.includes(d.idx);
                return (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => toggleDay(d.idx)}
                    className={cn(
                      'rounded-[var(--radius)] border px-2.5 py-1 font-mono text-[11px] transition-colors',
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
            <p className="text-xs text-[color:hsl(var(--destructive))]">
              Start must be before end
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={invalid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HourSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
      className="h-7 rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-2 font-mono text-[12px]"
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, '0')}:00
        </option>
      ))}
    </select>
  );
}
