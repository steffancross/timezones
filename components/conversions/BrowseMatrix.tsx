'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MatrixSource } from '@/lib/conversions/matrix-data';
import { currentOffsetBetween, nowIn } from '@/lib/time/luxon';
import { cn } from '@/lib/utils';
import { RegionPills, type RegionFilter } from './RegionPills';

interface Props {
  sources: MatrixSource[];
  /** Fallback when no `?from=` is present (or the value doesn't resolve). */
  initialSelectedId: string;
}

export function BrowseMatrix({ sources, initialSelectedId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected source is URL-driven (?from=). This makes every source view a
  // shareable URL and — critically for SEO — gives crawlers a real link to
  // follow from each sidebar row, so every (source, destination) pair page
  // becomes reachable in two hops from /conversions.
  const fromParam = searchParams.get('from');
  const selectedId =
    fromParam && sources.some((s) => s.id === fromParam) ? fromParam : initialSelectedId;

  const setSelectedId = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', id);
      router.replace(`/conversions?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const [region, setRegion] = useState<RegionFilter>('All');
  const [query, setQuery] = useState('');

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return () => true;
    return (s: MatrixSource) =>
      s.name.toLowerCase().includes(q) ||
      s.detail.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q);
  }, [query]);

  const visibleSources = useMemo(() => {
    return sources.filter((s) => {
      if (region !== 'All' && s.region !== region && s.region !== 'Global') return false;
      return matchesQuery(s);
    });
  }, [sources, region, matchesQuery]);

  // If the selected source is filtered out, auto-pick the first visible.
  useEffect(() => {
    if (visibleSources.length === 0) return;
    if (!visibleSources.some((s) => s.id === selectedId)) {
      setSelectedId(visibleSources[0]?.id ?? '');
    }
  }, [visibleSources, selectedId, setSelectedId]);

  const selectedSource = sources.find((s) => s.id === selectedId) ?? null;

  // Destinations are NOT filtered by the search query — only by region. The
  // query's job is to narrow the sidebar so the user can pick a source; once a
  // source is selected, the body shows all of its (region-eligible) targets.
  // Otherwise searching "los angeles" picks LA as the source then filters
  // destinations to only things containing "los angeles", leaving an empty grid.
  const destinations = useMemo(() => {
    if (!selectedSource) return [];
    return sources
      .filter((s) => s.id !== selectedSource.id)
      .filter((s) => {
        if (region !== 'All' && s.region !== region && s.region !== 'Global') return false;
        return true;
      })
      .sort((a, b) => b.popularity - a.popularity);
  }, [sources, selectedSource, region]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any zone or city…"
          aria-label="Filter sources and destinations"
          className={cn(
            'h-9 min-w-[240px] flex-1 rounded-md border border-border bg-[var(--input-bg)] px-3',
            'text-[13px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-subtle)]',
            'focus:border-[color:var(--brand)] focus:outline-none focus:shadow-[0_0_0_3px_var(--brand-soft)]',
            'sm:max-w-[360px]',
          )}
        />
        <RegionPills value={region} onChange={setRegion} />
        <span className="ml-auto font-mono text-[11px] text-[color:var(--fg-subtle)]">
          {visibleSources.length} sources · {destinations.length} destinations
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[248px_1fr]">
        <SourceSidebar sources={visibleSources} selectedId={selectedId} onSelect={setSelectedId} />
        <DestinationsPane source={selectedSource} destinations={destinations} />
      </div>
    </div>
  );
}

function SourceSidebar({
  sources,
  selectedId,
  onSelect,
}: {
  sources: MatrixSource[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (sources.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-[13px] text-[color:var(--fg-subtle)]">
        No matching sources.
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto rounded-lg border border-border bg-card p-1"
      style={{ maxHeight: '580px' }}
    >
      <ul className="space-y-px">
        {sources.map((s) => {
          const active = s.id === selectedId;
          return (
            <li key={s.id}>
              {/*
                Anchor (not button) so crawlers can follow each source to its
                /conversions?from=… view and reach every destination pair from
                there. onClick intercepts the navigation to do an in-page
                router.replace instead of a full page reload.
              */}
              <a
                href={`/conversions?from=${s.id}`}
                onClick={(e) => {
                  // Let modifier-clicks (cmd/ctrl, middle-click, etc.) open in
                  // a new tab natively.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  onSelect(s.id);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px]',
                  'transition-colors',
                  active
                    ? 'bg-[var(--brand-soft)] text-[color:var(--fg)]'
                    : 'text-[color:var(--fg)] hover:bg-[var(--hover)]',
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[10.5px] uppercase tracking-[0.04em]',
                    active ? 'text-[color:var(--brand)]' : 'text-[color:var(--fg-subtle)]',
                  )}
                >
                  {s.detail}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DestinationsPane({
  source,
  destinations,
}: {
  source: MatrixSource | null;
  destinations: MatrixSource[];
}) {
  if (!source) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-center">
          <div className="text-[15px] font-medium text-[color:var(--fg)]">No source selected</div>
          <div className="mt-1 text-[13px] text-[color:var(--fg-subtle)]">
            Pick a zone or city in the sidebar to see its destinations.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-card"
      style={{ minHeight: '480px' }}
    >
      <DestinationsHeader source={source} count={destinations.length} />
      {destinations.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="text-center">
            <div className="text-[15px] font-medium text-[color:var(--fg)]">
              No destinations match the filter.
            </div>
            <div className="mt-1 text-[13px] text-[color:var(--fg-subtle)]">
              Try a different region or clear the search.
            </div>
          </div>
        </div>
      ) : (
        <ul
          className="grid gap-0.5 p-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
          {destinations.map((d) => (
            <DestinationRow key={d.id} source={source} dest={d} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DestinationsHeader({ source, count }: { source: MatrixSource; count: number }) {
  // Live local time in source — computed once at mount.
  const [time, setTime] = useState<string>('');
  useEffect(() => {
    setTime(nowIn(source.iana).toFormat('h:mm a · ZZZZ'));
  }, [source]);

  return (
    <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
      <div>
        <h3 className="text-[19px] font-semibold leading-tight text-[color:var(--fg)]">
          From {source.name}
        </h3>
        {time && (
          <div className="mt-0.5 font-mono text-[11.5px] text-[color:var(--fg-muted)]">{time}</div>
        )}
      </div>
      <span className="font-mono text-[11px] text-[color:var(--fg-subtle)]">
        {count} {count === 1 ? 'destination' : 'destinations'}
      </span>
    </div>
  );
}

function DestinationRow({ source, dest }: { source: MatrixSource; dest: MatrixSource }) {
  const [time, setTime] = useState<string>('');
  const [delta, setDelta] = useState<string>('');

  useEffect(() => {
    setTime(nowIn(dest.iana).toFormat('h:mm a'));
    const minutes = currentOffsetBetween(dest.iana, source.iana);
    setDelta(formatDelta(minutes));
  }, [source, dest]);

  const ahead = delta.startsWith('+');
  const behind = delta.startsWith('−');

  return (
    <li>
      <Link
        prefetch={false}
        href={`/convert/${source.id}-to-${dest.id}`}
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-[color:var(--fg)] transition-colors hover:bg-[var(--hover)]"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{dest.name}</span>
        <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-[color:var(--fg-muted)]">
          {time}
        </span>
        <span
          className={cn(
            'shrink-0 font-mono text-[11.5px] font-semibold tabular-nums',
            ahead && 'text-[color:var(--delta-ahead)]',
            behind && 'text-[color:var(--delta-behind)]',
            !ahead && !behind && 'text-[color:var(--fg-subtle)]',
          )}
        >
          {delta}
        </span>
      </Link>
    </li>
  );
}

function formatDelta(minutes: number): string {
  if (minutes === 0) return '0h';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h${m}`;
}
