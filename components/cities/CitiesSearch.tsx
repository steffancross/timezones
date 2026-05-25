'use client';

import { Building2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { loadSearchIndex, searchAll } from '@/lib/search/runtime';
import type { SearchResult } from '@/lib/search/types';
import { cn } from '@/lib/utils';

export interface PopularCity {
  id: string;
  name: string;
  country: string;
}

interface Props {
  /** Tier 1 cities, pre-sorted, shown when the dropdown opens with no query. */
  popularCities: PopularCity[];
  /** Total cities in the index — shown in the trigger's secondary line. */
  totalCount: number;
}

/**
 * Cities-only search dropdown. Modeled on conversions' PairSelector but
 * single-pick: clicking a result navigates to /time-in/<slug> via the App
 * Router. Does not affect what's rendered behind it.
 */
export function CitiesSearch({ popularCities, totalCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHover = useCallback(() => {
    loadSearchIndex().catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      return;
    }
    loadSearchIndex().catch(() => {});
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchAll(q, 50)
        .then((r) => {
          setResults(r.filter((res) => res.type === 'city').slice(0, 30));
          setLoading(false);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const navigate = useCallback(
    (slug: string) => {
      setOpen(false);
      router.push(`/time-in/${slug}`);
    },
    [router],
  );

  const handleInputKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && results[0]) {
        e.preventDefault();
        navigate(results[0].slug);
      }
    },
    [results, navigate],
  );

  const q = query.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={handleHover}
          aria-label="Search cities"
          className={cn(
            'group relative flex h-[68px] w-full flex-col items-start justify-end',
            'rounded-lg border border-[color:var(--border)] bg-[var(--card)] px-3.5 pb-2 pt-5 text-left',
            'transition-colors hover:border-[color:var(--border-strong)]',
            'data-[state=open]:border-[color:var(--brand)]',
            'data-[state=open]:shadow-[0_0_0_3px_var(--brand-soft)]',
          )}
        >
          <span className="absolute left-3.5 top-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--fg-subtle)]">
            FIND A CITY
          </span>
          <span className="truncate text-[17px] font-semibold leading-tight text-[color:var(--fg)]">
            Search cities
          </span>
          <span className="mt-0.5 truncate font-mono text-[11.5px] text-[color:var(--fg-muted)]">
            {totalCount} cities · all time zones
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-h-[380px] overflow-hidden p-0"
      >
        <div className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-[var(--card)] p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--fg-subtle)]"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKey}
              placeholder="Search cities…"
              aria-label="Search cities"
              className={cn(
                'h-8 w-full rounded-md border border-[color:var(--border)] bg-[var(--input-bg)] pl-8 pr-2',
                'text-[13px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-subtle)]',
                'focus:border-[color:var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-soft)] focus:outline-none',
              )}
            />
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-1">
          {q === '' && !loading && (
            <>
              <GroupHeader>Popular cities</GroupHeader>
              {popularCities.map((c) => (
                <PopularRow key={c.id} city={c} onPick={navigate} />
              ))}
            </>
          )}

          {q !== '' && (
            <FilteredResults loading={loading} query={q} results={results} onPick={navigate} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilteredResults({
  loading,
  query,
  results,
  onPick,
}: {
  loading: boolean;
  query: string;
  results: SearchResult[];
  onPick: (slug: string) => void;
}) {
  if (loading && results.length === 0) {
    return <div className="px-3 py-2 text-[13px] text-[color:var(--fg-subtle)]">Searching…</div>;
  }
  if (results.length === 0) {
    return (
      <div className="px-3 py-2 text-[13px] text-[color:var(--fg-subtle)]">
        No cities for &ldquo;{query}&rdquo;
      </div>
    );
  }
  return (
    <>
      <GroupHeader>
        {results.length} {results.length === 1 ? 'match' : 'matches'}
      </GroupHeader>
      {results.map((r) => (
        <ResultRow key={r.id} result={r} query={query} onPick={onPick} />
      ))}
    </>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-2.5 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--fg-subtle)]">
      {children}
    </div>
  );
}

function PopularRow({ city, onPick }: { city: PopularCity; onPick: (slug: string) => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => onPick(city.id)}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px]',
        'text-[color:var(--fg)] transition-colors hover:bg-[var(--hover)]',
      )}
    >
      <Building2 className="size-3.5 shrink-0 text-[color:var(--fg-subtle)]" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{city.name}</span>
      <span className="ml-auto shrink-0 font-mono text-[11px] text-[color:var(--fg-subtle)]">
        {city.country}
      </span>
    </button>
  );
}

function ResultRow({
  result,
  query,
  onPick,
}: {
  result: SearchResult;
  query: string;
  onPick: (slug: string) => void;
}) {
  const offset = useMemo(() => offsetFromSecondary(result.display_secondary), [result]);
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => onPick(result.slug)}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px]',
        'text-[color:var(--fg)] transition-colors hover:bg-[var(--hover)]',
      )}
    >
      <Building2 className="size-3.5 shrink-0 text-[color:var(--fg-subtle)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{highlight(result.display_name, query)}</div>
        <div className="truncate text-[11px] text-[color:var(--fg-subtle)]">
          {result.display_secondary}
        </div>
      </div>
      {offset && (
        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--fg-subtle)]">
          {offset}
        </span>
      )}
    </button>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-[color:var(--brand)]">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function offsetFromSecondary(s: string): string | null {
  const m = s.match(/(GMT[+-]?\d+(?::\d+)?|UTC[+-]?\d+(?::\d+)?|[+-]\d+(?::\d+)?)/);
  return m ? m[0] : null;
}
