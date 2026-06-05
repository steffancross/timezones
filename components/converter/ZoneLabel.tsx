'use client';

import { useConverterStore } from '@/components/converter/store-context';
import { getZoneById } from '@/data/zones';
import { getCityById } from '@/lib/cities/resolve';
import { useNow } from '@/lib/hooks/useNow';
import type { ZoneRef } from '@/lib/store/converter';
import { formatDate, formatOffset, formatTime } from '@/lib/time/format';
import { cn } from '@/lib/utils';
import { currentAbbreviation } from '@/lib/zones/abbreviation';
import { Home } from 'lucide-react';
import { DateTime } from 'luxon';

interface Props {
  zone: ZoneRef;
  index: number;
  isHome: boolean;
}

export function ZoneLabel({ zone, isHome }: Props) {
  const now = useNow('minute');
  const format = useConverterStore((s) => s.format);
  const rangeStartMin = useConverterStore((s) => s.rangeStartMin);
  const rangeEndMin = useConverterStore((s) => s.rangeEndMin);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const zones = useConverterStore((s) => s.zones);

  const homeIana = zones[0]?.iana;

  // Range start (or `now` when no range) projected into this row's zone.
  const displayTime = computeDisplayTime({
    now,
    zoneIana: zone.iana,
    rangeStartMin,
    anchorDate,
    homeIana,
  });

  // When a range is selected, the row shows the span (start–end) in its own
  // zone instead of a single clock. Null when there's no range.
  const rangeEndTime =
    rangeStartMin !== null && rangeEndMin !== null && homeIana
      ? DateTime.fromISO(anchorDate, { zone: homeIana })
          .startOf('day')
          .plus({ minutes: rangeEndMin })
          .setZone(zone.iana)
      : null;

  const meta = getLabelMeta(zone);
  const abbreviation = currentAbbreviation(zone.iana, displayTime);
  const offsetText = formatOffset(displayTime.offset);

  // "Next day" indicator: when a range is set and the projected date in this
  // zone differs from the anchor date in the home zone, the date reads in brand
  // color to draw the eye.
  const isNextDay = rangeStartMin !== null && displayTime.toISODate() !== anchorDate;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {isHome && (
          <Home className="size-3.5 shrink-0 text-[color:var(--brand)]" aria-label="Home zone" />
        )}
        <span
          className="truncate text-[15px] font-semibold leading-tight tracking-[-0.005em] text-[color:var(--fg)]"
          title={meta.primary}
        >
          {meta.primary}
        </span>
        <span className="shrink-0 text-[12px] font-medium text-[color:var(--fg-subtle)]">
          {abbreviation}
        </span>
      </div>

      <div className="mt-0.5 truncate text-[12px] text-[color:var(--fg-muted)]">
        {meta.secondary ? `${meta.secondary} · ${offsetText}` : offsetText}
      </div>

      <div className="mt-1.5 flex min-w-0 items-baseline gap-2">
        <span
          className={cn(
            'whitespace-nowrap font-mono font-medium tracking-[-0.01em] tabular-nums text-[color:var(--fg)]',
            // A range string is wider than a single clock and the label column is
            // a fixed 240px on desktop — drop a size when showing a range so it
            // and the date still fit on one line.
            rangeEndTime ? 'text-[14px]' : 'text-[16px]',
          )}
        >
          {rangeEndTime
            ? `${formatTime(displayTime, format)} – ${formatTime(rangeEndTime, format)}`
            : formatTime(displayTime, format)}
        </span>
        <span
          className={cn(
            'min-w-0 truncate font-mono text-[11px] tabular-nums',
            isNextDay ? 'font-medium text-[color:var(--brand)]' : 'text-[color:var(--fg-subtle)]',
          )}
        >
          {formatDate(displayTime)}
        </span>
      </div>
    </div>
  );
}

function computeDisplayTime(args: {
  now: DateTime;
  zoneIana: string;
  rangeStartMin: number | null;
  anchorDate: string;
  homeIana: string | undefined;
}): DateTime {
  const { now, zoneIana, rangeStartMin, anchorDate, homeIana } = args;
  if (rangeStartMin === null || !homeIana) {
    return now.setZone(zoneIana);
  }
  const anchored = DateTime.fromISO(anchorDate, { zone: homeIana })
    .startOf('day')
    .plus({ minutes: rangeStartMin });
  return anchored.setZone(zoneIana);
}

function getLabelMeta(zone: ZoneRef): { primary: string; secondary: string } {
  if (zone.kind === 'zone') {
    const z = getZoneById(zone.slug);
    return { primary: z.display_name, secondary: z.region };
  }
  const c = getCityById(zone.slug);
  if (!c) return { primary: zone.slug, secondary: '' };
  return {
    primary: c.name,
    secondary: c.admin1 ? `${c.admin1}, ${c.country}` : c.country,
  };
}
