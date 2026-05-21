'use client';

import { DateTime } from 'luxon';
import { Home } from 'lucide-react';
import { getCityById } from '@/lib/cities/resolve';
import { useNow } from '@/lib/hooks/useNow';
import { useConverterStore } from '@/lib/store/converter';
import { formatDate, formatOffset, formatTime } from '@/lib/time/format';
import { cn } from '@/lib/utils';
import { getZoneById } from '@/data/zones';
import type { ZoneRef } from '@/lib/store/converter';

interface Props {
  zone: ZoneRef;
  index: number;
  isHome: boolean;
}

export function ZoneLabel({ zone, isHome }: Props) {
  const now = useNow('minute');
  const format = useConverterStore((s) => s.format);
  const anchorHour = useConverterStore((s) => s.anchorHour);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const zones = useConverterStore((s) => s.zones);

  const displayTime = computeDisplayTime({
    now,
    zoneIana: zone.iana,
    anchorHour,
    anchorDate,
    homeIana: zones[0]?.iana,
  });

  const meta = getLabelMeta(zone);
  const abbreviation = displayTime.toFormat('ZZZZ');
  const offsetText = formatOffset(displayTime.offset);

  // "Next day" indicator: when an anchor is set and the projected date in this
  // zone differs from the anchor date in the home zone, the date reads in brand
  // color to draw the eye.
  const isNextDay = anchorHour !== null && displayTime.toISODate() !== anchorDate;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {isHome && (
          <Home
            className="size-3.5 shrink-0 text-[color:var(--brand)]"
            aria-label="Home zone"
          />
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

      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-mono text-[16px] font-medium tracking-[-0.01em] tabular-nums text-[color:var(--fg)]">
          {formatTime(displayTime, format)}
        </span>
        <span
          className={cn(
            'font-mono text-[11px] tabular-nums',
            isNextDay
              ? 'font-medium text-[color:var(--brand)]'
              : 'text-[color:var(--fg-subtle)]',
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
  anchorHour: number | null;
  anchorDate: string;
  homeIana: string | undefined;
}): DateTime {
  const { now, zoneIana, anchorHour, anchorDate, homeIana } = args;
  if (anchorHour === null || !homeIana) {
    return now.setZone(zoneIana);
  }
  const anchor = DateTime.fromISO(anchorDate, { zone: homeIana }).set({
    hour: anchorHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return anchor.setZone(zoneIana);
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
