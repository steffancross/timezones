'use client';

import { X } from 'lucide-react';
import { DateTime } from 'luxon';
import { useConverterStore } from '@/lib/store/converter';
import { formatTime } from '@/lib/time/format';

/**
 * Pinned anchor pill. Lives in the page-heading row; never pushes content
 * down. When no anchor is set, renders nothing.
 */
export function AnchorPill() {
  const anchorHour = useConverterStore((s) => s.anchorHour);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const zones = useConverterStore((s) => s.zones);
  const format = useConverterStore((s) => s.format);
  const resetAnchor = useConverterStore((s) => s.resetAnchor);

  const homeIana = zones[0]?.iana;
  if (anchorHour === null || !homeIana) return null;

  const anchored = DateTime.fromISO(anchorDate, { zone: homeIana }).set({ hour: anchorHour });
  const timeText = formatTime(anchored, format);

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
        Pinned
      </span>
      <span className="font-semibold text-[12.5px] text-[color:var(--fg)]">{timeText}</span>
      <button
        type="button"
        onClick={resetAnchor}
        aria-label="Clear pinned time"
        className="inline-flex size-[22px] items-center justify-center rounded-full text-[color:var(--fg-muted)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] hover:text-[color:var(--fg)]"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
