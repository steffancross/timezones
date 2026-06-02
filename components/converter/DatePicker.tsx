'use client';

import { Calendar } from '@/components/converter/Calendar';
import { useConverterStore } from '@/components/converter/store-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { todayInZone } from '@/lib/store/converter';
import { CalendarDays } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';

/**
 * Date pill: a popover trigger styled to the toolbar's pill geometry that opens
 * a self-contained Luxon-backed calendar. Replaces the native `<input type="date">`
 * (inconsistent per-browser rendering, dead clear button, Chrome dropping the icon)
 * with one we fully control and theme.
 */
export function DatePicker() {
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const setAnchorDate = useConverterStore((s) => s.setAnchorDate);
  const zones = useConverterStore((s) => s.zones);

  const [open, setOpen] = useState(false);

  // Home-zone today (zones[0] is the home zone by convention — see Converter.tsx).
  const today = todayInZone(zones[0]?.iana);

  const label = DateTime.fromISO(anchorDate).toFormat('MMM d, yyyy');

  function handleSelect(iso: string) {
    setAnchorDate(iso);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label="Anchor date"
        className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-2.5 font-mono text-[13px] tabular-nums text-[color:var(--fg)] outline-none transition-colors hover:bg-[var(--hover)] focus-visible:border-[color:var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] data-[state=open]:border-[color:var(--brand)]"
      >
        {label}
        <CalendarDays className="size-3.5 text-[color:var(--fg-muted)]" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto rounded-[var(--radius-lg,6px)] p-3">
        <Calendar value={anchorDate} today={today} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
