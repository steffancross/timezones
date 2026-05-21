'use client';

import { useNow } from '@/lib/hooks/useNow';
import type { ZoneRef } from '@/lib/store/converter';
import { useConverterStore } from '@/lib/store/converter';
import { anchorToZones } from '@/lib/time/luxon';
import { getNightHours } from '@/lib/time/sun';
import { getWorkingHoursOnDay, type WorkingHours } from '@/lib/time/working-hours';
import { getZoneByIana } from '@/lib/zones/resolve';
import { Moon, Sun } from 'lucide-react';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { HourTile } from './HourTile';

interface Props {
  zone: ZoneRef;
  index: number;
}

/**
 * Per-column projection from home zone to this row's zone.
 * `homeHour` is the column index (0-23) representing the home zone's local hour
 * on the anchor date. `localHour` / `localDate` / `dayDelta` is what that
 * instant looks like in this row's zone.
 */
export interface ColumnData {
  homeHour: number;
  localHour: number;
  localDate: string;
  dayDelta: number;
}

export function HourStrip({ zone, index }: Props) {
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const anchorHour = useConverterStore((s) => s.anchorHour);
  const format = useConverterStore((s) => s.format);
  const zones = useConverterStore((s) => s.zones);
  const dayNightOn = useConverterStore((s) => s.overlay.dayNight);
  const workHoursOn = useConverterStore((s) => s.overlay.workHours);
  const weekendOn = useConverterStore((s) => s.overlay.weekend);
  const workingHours = useConverterStore((s) => s.workingHours);
  const now = useNow('minute');

  const isHomeRow = index === 0;
  const homeIana = zones[0]?.iana;

  // 24-column projection. Computed once per (zone, homeIana, anchorDate) change
  // and passed into each tile — avoids the per-tile alignment recompute that
  // E3's markdown originally proposed (240 redundant Luxon calls/render).
  const columns = useMemo<ColumnData[]>(() => {
    if (!homeIana) return [];
    return Array.from({ length: 24 }, (_, h) => {
      const entry = anchorToZones(h, anchorDate, homeIana, [zone.iana]).get(zone.iana);
      if (!entry) {
        return { homeHour: h, localHour: h, localDate: anchorDate, dayDelta: 0 };
      }
      return {
        homeHour: h,
        localHour: entry.hour,
        localDate: entry.date,
        dayDelta: entry.day_delta,
      };
    });
  }, [zone.iana, anchorDate, homeIana]);

  // Row's primary date = the most common localDate across columns. Tiles whose
  // localDate differs render dimmed (off-day).
  const primaryDate = useMemo(() => {
    if (columns.length === 0) return anchorDate;
    const counts = new Map<string, number>();
    for (const c of columns) counts.set(c.localDate, (counts.get(c.localDate) ?? 0) + 1);
    let best = columns[0]?.localDate ?? anchorDate;
    let bestCount = 0;
    for (const [d, count] of counts) {
      if (count > bestCount) {
        best = d;
        bestCount = count;
      }
    }
    return best;
  }, [columns, anchorDate]);

  // The "now" column in centered mode = home zone's current local hour. The
  // dashed vertical guide threads through this column on every row; the badge
  // only renders above the home row.
  const nowColumnIndex = useMemo(() => {
    if (!homeIana) return null;
    const home = now.setZone(homeIana);
    if (home.toISODate() !== anchorDate) return null;
    return home.hour;
  }, [now, homeIana, anchorDate]);

  // Date-boundary chips: render a chip above each column whose localDate
  // differs from the previous column's. The first column (col 0) doesn't get a
  // chip — its date is already shown in the zone label.
  const boundaries = useMemo(() => {
    const out: Array<{ columnIndex: number; date: string }> = [];
    for (let c = 1; c < columns.length; c++) {
      const prev = columns[c - 1];
      const cur = columns[c];
      if (prev && cur && prev.localDate !== cur.localDate) {
        out.push({ columnIndex: c, date: cur.localDate });
      }
    }
    return out;
  }, [columns]);

  // Per-column weekend flags. A row that straddles Fri→Sat at some column
  // boundary recolors only the Sat (+ Sun) tiles — tick, label, AND baseline
  // segment under those tiles — not the whole row.
  const columnIsWeekend = useMemo(() => {
    if (!weekendOn) return columns.map(() => false);
    return columns.map((c) => {
      const dt = DateTime.fromISO(c.localDate, { zone: zone.iana });
      return dt.isValid && dt.weekday >= 6;
    });
  }, [weekendOn, columns, zone.iana]);

  return (
    <div className="relative w-full pt-[18px] pb-1 max-md:pt-[14px]">
      <div
        className="relative grid grid-cols-24 gap-0 h-10 max-md:h-7"
        role="row"
        aria-label={`Hour strip for ${zone.iana}`}
      >
        <BandOverlay
          columns={columns}
          zone={zone}
          primaryDate={primaryDate}
          dayNightOn={dayNightOn}
          workHoursOn={workHoursOn}
          workingHours={workingHours}
        />

        {columns.map((col, colIdx) => (
          <HourTile
            key={col.homeHour}
            column={col}
            columnIndex={colIdx}
            format={format}
            isOffDay={col.localDate !== primaryDate}
            isCurrentHour={nowColumnIndex === col.homeHour}
            isWeekend={columnIsWeekend[colIdx] ?? false}
          />
        ))}

        {anchorHour !== null && <AnchorGuide columnIndex={anchorHour} />}

        {nowColumnIndex !== null && <NowGuide columnIndex={nowColumnIndex} showBadge={isHomeRow} />}

        {boundaries.map((b) => (
          <DateBoundaryChip key={b.columnIndex} columnIndex={b.columnIndex} date={b.date} />
        ))}
      </div>
    </div>
  );
}

/**
 * Group sorted column indices into contiguous [start, end] runs.
 * Exported for tests; the band overlay also uses it internally.
 */
export function groupContiguous(cols: number[]): Array<[number, number]> {
  if (cols.length === 0) return [];
  const sorted = [...cols].sort((a, b) => a - b);
  const out: Array<[number, number]> = [];
  let s = sorted[0]!;
  let prev = s;
  for (let i = 1; i < sorted.length; i++) {
    const c = sorted[i]!;
    if (c === prev + 1) {
      prev = c;
    } else {
      out.push([s, prev]);
      s = c;
      prev = c;
    }
  }
  out.push([s, prev]);
  return out;
}

/**
 * Day/night and working-hours band overlay. Sits absolutely over the strip's
 * 24-col grid. Each segment lives on grid-row: 1 with `grid-auto-flow: dense`
 * so segments don't stack into a second row — see handoff README note.
 *
 * Bands paint into the COLUMNS where the row's local hour falls into night
 * (or working). In centered mode different rows show the band shifted, which
 * is the visualization the design intends.
 */
function BandOverlay({
  columns,
  zone,
  primaryDate,
  dayNightOn,
  workHoursOn,
  workingHours,
}: {
  columns: ColumnData[];
  zone: ZoneRef;
  primaryDate: string;
  dayNightOn: boolean;
  workHoursOn: boolean;
  workingHours: WorkingHours;
}) {
  const zoneMeta = getZoneByIana(zone.iana);

  const segments = useMemo(() => {
    const empty = {
      night: [] as Array<[number, number]>,
      day: [] as Array<[number, number]>,
      work: [] as Array<[number, number]>,
    };
    if (!zoneMeta || columns.length === 0) return empty;

    let night: Array<[number, number]> = [];
    let day: Array<[number, number]> = [];
    if (dayNightOn) {
      const nightSet = new Set(getNightHours(zone.iana, primaryDate, zoneMeta.lat, zoneMeta.lng));
      const nightCols: number[] = [];
      const dayCols: number[] = [];
      columns.forEach((c, i) => {
        if (nightSet.has(c.localHour)) nightCols.push(i);
        else dayCols.push(i);
      });
      night = groupContiguous(nightCols);
      day = groupContiguous(dayCols);
    }

    let work: Array<[number, number]> = [];
    if (workHoursOn) {
      const ref = DateTime.fromISO(primaryDate, { zone: zone.iana });
      const workSet = ref.isValid
        ? new Set(getWorkingHoursOnDay(ref.weekday, workingHours))
        : new Set<number>();
      const workCols: number[] = [];
      columns.forEach((c, i) => {
        if (workSet.has(c.localHour)) workCols.push(i);
      });
      work = groupContiguous(workCols);
    }

    return { night, day, work };
  }, [dayNightOn, workHoursOn, columns, primaryDate, workingHours, zone.iana, zoneMeta]);

  if ((!dayNightOn && !workHoursOn) || !zoneMeta) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid grid-cols-24 gap-0"
      style={{ gridAutoFlow: 'dense' }}
    >
      {segments.night.map(([s, e]) => (
        <BandSegment key={`n-${s}`} start={s} end={e} variant="night" />
      ))}
      {segments.day.map(([s, e]) => (
        <BandSegment key={`d-${s}`} start={s} end={e} variant="day" />
      ))}
      {segments.work.map(([s, e]) => (
        <BandSegment key={`w-${s}`} start={s} end={e} variant="work" />
      ))}
    </div>
  );
}

function BandSegment({
  start,
  end,
  variant,
}: {
  start: number;
  end: number;
  variant: 'night' | 'day' | 'work';
}) {
  const span = end - start + 1;
  const bg =
    variant === 'night'
      ? 'color-mix(in oklab, var(--band-night) calc(var(--band-night-alpha) * 100%), transparent)'
      : variant === 'work'
        ? 'color-mix(in oklab, var(--band-work) calc(var(--band-work-alpha) * 100%), transparent)'
        : 'transparent';

  return (
    <div
      className="relative"
      style={{ gridColumn: `${start + 1} / span ${span}`, gridRow: 1, background: bg }}
    >
      {variant === 'night' && (
        <Moon
          aria-hidden="true"
          className="absolute left-1 top-[3px] size-3 max-md:size-[9px] opacity-70 text-[oklch(0.32_0.06_250)] dark:text-[oklch(0.88_0.05_250)] dark:opacity-80"
        />
      )}
      {variant === 'day' && (
        <Sun
          aria-hidden="true"
          className="absolute left-1 top-[3px] size-3 max-md:size-[9px] opacity-70 text-[oklch(0.55_0.16_70)] dark:text-[oklch(0.80_0.14_75)] dark:opacity-85"
        />
      )}
      {/* No "working" label — the amber band recolor is the signal. */}
    </div>
  );
}

function AnchorGuide({ columnIndex }: { columnIndex: number }) {
  // Subtle vertical accent line at the anchor column center. Drawn beneath
  // the tile content (z-1), so the anchor tile fill still reads as solid.
  const leftPercent = ((columnIndex + 0.5) / 24) * 100;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-[1] -top-2 -bottom-2 w-0.5 -translate-x-1/2 rounded-[2px] bg-[var(--brand)] opacity-25"
      style={{ left: `${leftPercent}%` }}
    />
  );
}

function DateBoundaryChip({ columnIndex, date }: { columnIndex: number; date: string }) {
  const leftPercent = (columnIndex / 24) * 100;
  const label = DateTime.fromISO(date).toFormat('ccc LLL d').toUpperCase();
  // z-[5] sits above the now-guide line (z-3) and badge (z-4) so a chip and
  // guide landing on the same column don't cross-cut visually. Card-bg + 1px
  // y-padding mask the dashed line behind the chip text.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-[5] -top-4 max-md:-top-3 whitespace-nowrap border-l border-[color:var(--brand)] bg-card py-px pl-1 pr-0.5 font-mono text-[9.5px] max-md:text-[8.5px] font-semibold tracking-[0.06em] text-[color:var(--brand)]"
      style={{ left: `${leftPercent}%` }}
    >
      {label}
    </div>
  );
}

function NowGuide({ columnIndex, showBadge }: { columnIndex: number; showBadge: boolean }) {
  const leftPercent = ((columnIndex + 0.5) / 24) * 100;
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-[3] -top-2.5 -bottom-0.5 -translate-x-1/2 border-l-[1.5px] border-dashed border-[color:var(--brand)]"
        style={{ left: `${leftPercent}%` }}
      />
      {showBadge && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-[4] -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[2px] bg-[var(--brand)] px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.04em] text-[color:var(--brand-fg)]"
          style={{ left: `${leftPercent}%` }}
        >
          Now
        </div>
      )}
    </>
  );
}
