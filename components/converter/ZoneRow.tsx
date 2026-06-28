'use client';

import { useConverterStore } from '@/components/converter/store-context';
import type { ZoneRef } from '@/lib/store/converter';
import { cn } from '@/lib/utils';
import { HourStrip } from './HourStrip';
import { ZoneLabel } from './ZoneLabel';
import { ZoneRowControls } from './ZoneRowControls';

interface ZoneRowProps {
  zone: ZoneRef;
  index: number;
}

/**
 * Desktop grid template shared with the unified RangeBand overlay in
 * Converter.tsx — both have to use identical column widths/gap/padding so the
 * overlay's strip column lines up with this row's strip column on every row.
 * Mobile classes stay inline in the row since the overlay doesn't render on
 * mobile (per-row bands inside each HourStrip handle that case).
 */
export const ZONE_ROW_DESKTOP_GRID = 'md:grid-cols-[32px_240px_1fr] md:gap-x-3 md:pl-2 md:pr-3';

/**
 * One zone row. Home is always row index 0 per the v1 home-selection rule
 * (user reorders rows to change which zone is home).
 *
 * Desktop grid: 32px controls / 240px label / 1fr strip.
 * Mobile grid: label / controls (top row), strip/slider (bottom row spanning).
 */
export function ZoneRow({ zone, index }: ZoneRowProps) {
  const totalZones = useConverterStore((s) => s.zones.length);
  const isHome = index === 0;

  return (
    <div
      className={cn(
        'grid items-center gap-y-2 gap-x-2.5 px-3 py-3.5',
        index < totalZones - 1 && 'border-b',
        // Mobile: 2 cols (label 1fr, controls auto), 2 rows (label+controls / strip)
        'grid-cols-[1fr_auto] grid-rows-[auto_auto]',
        // Desktop: 3 cols (32px / 240px / 1fr), 1 row. Grid template lives in
        // ZONE_ROW_DESKTOP_GRID so the unified RangeBand overlay can reuse it.
        ZONE_ROW_DESKTOP_GRID,
        'md:grid-rows-1 md:py-3.5',
      )}
    >
      <div
        className={cn(
          // Mobile: top-right
          'col-start-2 row-start-1 self-center',
          // Desktop: leftmost column
          'md:col-start-1 md:row-start-1 md:justify-self-center',
        )}
      >
        <ZoneRowControls index={index} isFirst={index === 0} isLast={index === totalZones - 1} />
      </div>

      <div className={cn('col-start-1 row-start-1 min-w-0', 'md:col-start-2 md:row-start-1')}>
        <ZoneLabel zone={zone} index={index} isHome={isHome} />
      </div>

      <div
        className={cn(
          // Mobile: strip/slider spans full width on row 2
          'col-span-2 row-start-2 min-w-0 pt-1',
          // Desktop: third column on row 1
          'md:col-span-1 md:col-start-3 md:row-start-1 md:pt-0',
        )}
      >
        <HourStrip zone={zone} index={index} />
      </div>
    </div>
  );
}
