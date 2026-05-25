'use client';

import { X } from 'lucide-react';
import { DateTime } from 'luxon';
import { useConverterStore } from '@/lib/store/converter';
import { formatTime } from '@/lib/time/format';

/**
 * Range pill — **mobile only**. Lives in the page-heading row; never pushes
 * content down. Shows the selected range (start time, plus end time when the
 * block is wider than 1 tile). Renders nothing when no range is set.
 *
 * On desktop the heading-row pill is hidden (`md:hidden` at the mount site
 * in Converter.tsx) — the RangeActionBar below the zones card carries the
 * range summary plus the Copy/Email/Calendar actions, so the pill would be
 * redundant. Mobile keeps the pill because the action bar's button labels
 * collapse to icon-only there and the pill is the more legible glance-state.
 */
export function RangePill() {
  const rangeStart = useConverterStore((s) => s.rangeStart);
  const rangeEnd = useConverterStore((s) => s.rangeEnd);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const zones = useConverterStore((s) => s.zones);
  const format = useConverterStore((s) => s.format);
  const clearRange = useConverterStore((s) => s.clearRange);

  const homeIana = zones[0]?.iana;
  if (rangeStart === null || !homeIana) return null;

  const end = rangeEnd ?? rangeStart;
  const startDt = DateTime.fromISO(anchorDate, { zone: homeIana }).set({ hour: rangeStart });
  // End-exclusive display: the range covers tiles [start..end] inclusive, so
  // the readable end-time sits at the right edge of the last covered tile —
  // i.e. end + 1.
  const endDt = DateTime.fromISO(anchorDate, { zone: homeIana }).set({ hour: end + 1 });
  const label =
    end === rangeStart
      ? formatTime(startDt, format)
      : `${formatTime(startDt, format)} – ${formatTime(endDt, format)}`;

  return (
    <div
      className="
        inline-flex h-7 shrink-0 items-center gap-2 rounded-full
        border border-[color:color-mix(in_oklab,var(--brand)_30%,transparent)]
        bg-[var(--brand-soft)]
        pl-3 pr-1 text-[12px] text-[color:var(--fg)]
      "
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--brand)]" />
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.03em] text-[color:var(--fg-muted)]">
        Range
      </span>
      <span className="whitespace-nowrap font-semibold text-[12.5px] text-[color:var(--fg)]">
        {label}
      </span>
      <button
        type="button"
        onClick={clearRange}
        aria-label="Clear range"
        className="inline-flex size-[22px] items-center justify-center rounded-full text-[color:var(--fg-muted)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] hover:text-[color:var(--fg)]"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
