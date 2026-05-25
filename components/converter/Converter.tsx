'use client';

import { getZoneByIana, getZoneById } from '@/data/zones';
import { getCityById } from '@/lib/cities/resolve';
import { useDragSelectionGlobalListener } from '@/lib/converter/drag-selection';
import { useNow } from '@/lib/hooks/useNow';
import type { SearchResult } from '@/lib/search/types';
import type { ZoneRef } from '@/lib/store/converter';
import { useConverterStore } from '@/lib/store/converter';
import { formatDate } from '@/lib/time/format';
import { useCallback, useEffect, useState } from 'react';
import { DatePicker } from './DatePicker';
import { DSTBanner } from './DSTBanner';
import { EmptyState } from './EmptyState';
import { FormatToggle } from './FormatToggle';
import { RangeActionBar } from './RangeActionBar';
import { RangeBand } from './RangeBand';
import { RangePill } from './RangePill';
import { ResetButton } from './ResetButton';
import { SearchInput } from './SearchInput';
import { SettingsMenu } from './SettingsMenu';
import { ShareButton } from './ShareButton';
import { ZONE_ROW_DESKTOP_GRID, ZoneRow } from './ZoneRow';

function getHomeName(zone: ZoneRef | undefined): string | null {
  if (!zone) return null;
  if (zone.kind === 'zone') return getZoneById(zone.slug).display_name;
  return getCityById(zone.slug)?.name ?? zone.slug;
}

interface ConverterProps {
  /**
   * Visitor's IANA timezone from the cf-timezone header, when available
   * (dynamic routes only). The heading row locks to this zone rather than
   * `zones[0]` so it doesn't switch around as the user reorders the converter.
   * Pair pages are statically generated and won't pass this prop — on those,
   * the visitor zone is resolved client-side from `Intl`.
   * Falls back to `zones[0]` if the IANA isn't a known zone in our dataset.
   */
  visitorIana?: string;
}

export function Converter({ visitorIana }: ConverterProps = {}) {
  const zones = useConverterStore((s) => s.zones);
  const addZone = useConverterStore((s) => s.addZone);
  const format = useConverterStore((s) => s.format);
  const now = useNow('minute');

  useDragSelectionGlobalListener();

  const [resolvedVisitorIana, setResolvedVisitorIana] = useState<string | undefined>(visitorIana);
  useEffect(() => {
    if (visitorIana) return;
    try {
      setResolvedVisitorIana(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      // Browser doesn't expose Intl timezone — leave undefined, heading
      // falls back to zones[0].
    }
  }, [visitorIana]);

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

  const visitorZone = resolvedVisitorIana ? getZoneByIana(resolvedVisitorIana) : null;
  const headingIana = visitorZone?.iana ?? zones[0]?.iana;
  const headingName = visitorZone?.display_name ?? getHomeName(zones[0]);
  const headingNow = headingIana ? now.setZone(headingIana) : null;
  const liveStamp = headingNow
    ? headingNow.toFormat(format === '24' ? 'HH:mm' : 'h:mm a').toLowerCase()
    : null;
  const dateStamp = headingNow ? formatDate(headingNow) : null;

  return (
    <div className="space-y-4">
      {/*
        Heading row — home-zone identity (name + live time + date) on the left,
        range pill on the right. The page-level H1 above the converter already
        carries the route's SEO title; this row is contextual data, not a
        section heading, so it deliberately reads as a status line rather than
        echoing the H1.
      */}
      {headingName && (
        <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[22px] font-semibold tracking-[-0.015em] text-[color:var(--fg)]">
              {headingName}
            </span>
            {liveStamp && (
              <span className="font-mono text-[12px] font-medium tabular-nums text-[color:var(--fg-subtle)]">
                {liveStamp}
              </span>
            )}
            {dateStamp && (
              <span className="font-mono text-[12px] tabular-nums text-[color:var(--fg-muted)]">
                {dateStamp}
              </span>
            )}
          </div>
          {/* ml-auto pushes the pill right whether it shares a line with the
              name (single-row layout) or wraps to its own line (mobile when
              name + pill don't both fit). Without ml-auto, a wrapped pill
              would left-align under the name. */}
          <div className="ml-auto md:hidden">
            <RangePill />
          </div>
        </div>
      )}

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
            <ShareButton />
            <SettingsMenu />
          </div>
        </div>
      </div>

      {/* Zones */}
      {zones.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="relative rounded-[var(--radius-lg,6px)] border border-[color:var(--border)] bg-card">
          {zones.map((zone, i) => (
            <ZoneRow key={`${zone.kind}:${zone.slug}`} zone={zone} index={i} />
          ))}
          {/* Desktop: one unified range band hoisted above the row stack so it
              spans every row vertically. Mobile renders per-row bands inside
              each HourStrip instead (the stacked label-over-strip mobile
              layout doesn't admit a single vertical rectangle). The grid below
              mirrors ZoneRow's desktop template so column 3 lines up with the
              strip on every row. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-3 left-0 right-0 hidden md:grid ${ZONE_ROW_DESKTOP_GRID}`}
          >
            <div />
            <div />
            <div className="relative">
              <RangeBand className="inset-y-0" />
            </div>
          </div>
        </div>
      )}

      {/* Sits below the zones card so showing/hiding it doesn't shift the
          strip vertically when the user makes a selection. */}
      <RangeActionBar />
    </div>
  );
}
