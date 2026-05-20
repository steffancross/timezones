'use client';

import { useCallback } from 'react';
import { useNow } from '@/lib/hooks/useNow';
import { useConverterStore } from '@/lib/store/converter';
import { AnchorPill } from './AnchorPill';
import { DatePicker } from './DatePicker';
import { DSTBanner } from './DSTBanner';
import { EmptyState } from './EmptyState';
import { FormatToggle } from './FormatToggle';
import { ResetButton } from './ResetButton';
import { SearchInput } from './SearchInput';
import { SettingsMenu } from './SettingsMenu';
import { ZoneRow } from './ZoneRow';
import type { SearchResult } from '@/lib/search/types';
import type { ZoneRef } from '@/lib/store/converter';

interface Props {
  /**
   * Heading text rendered to the left of the live-time stamp + anchor pill.
   * Pages can override per route; landing default is "Time converter".
   */
  title?: string;
}

export function Converter({ title = 'Time converter' }: Props) {
  const zones = useConverterStore((s) => s.zones);
  const addZone = useConverterStore((s) => s.addZone);
  const format = useConverterStore((s) => s.format);
  const now = useNow('minute');

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      const ref: ZoneRef = {
        kind: result.type,
        slug: result.slug,
        iana: result.iana,
      };
      addZone(ref);
    },
    [addZone],
  );

  const homeIana = zones[0]?.iana;
  const liveStamp = homeIana
    ? now.setZone(homeIana).toFormat(format === '24' ? 'HH:mm' : 'h:mm a').toLowerCase()
    : null;

  return (
    <div className="space-y-4">
      {/* Heading row — title, live stamp, anchor pill (right-aligned). */}
      <div className="flex min-h-8 items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.015em] text-[color:var(--fg)]">
            {title}
          </h2>
          {liveStamp && (
            <span className="font-mono text-[12px] font-medium tabular-nums text-[color:var(--fg-subtle)]">
              {liveStamp}
            </span>
          )}
        </div>
        <AnchorPill />
      </div>

      <DSTBanner />

      {/* Toolbar */}
      <div className="rounded-[var(--radius-lg,6px)] border border-[color:var(--border)] bg-card p-2.5">
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <div className="min-w-0 flex-1 max-md:basis-full">
            <SearchInput onSelect={handleSearchSelect} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FormatToggle />
            <DatePicker />
            <ResetButton />
            <SettingsMenu />
          </div>
        </div>
      </div>

      {/* Zones */}
      {zones.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-[var(--radius-lg,6px)] border border-[color:var(--border)] bg-card">
          {zones.map((zone, i) => (
            <ZoneRow key={`${zone.kind}:${zone.slug}`} zone={zone} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
