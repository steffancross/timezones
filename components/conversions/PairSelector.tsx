'use client';

import { Building2, Globe2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  type CuratedSelections,
  type Selection,
  selectionFromSearchResult,
} from '@/lib/conversions/selection';
import { loadSearchIndex, searchAll } from '@/lib/search/runtime';
import type { SearchResult } from '@/lib/search/types';
import { cn } from '@/lib/utils';

interface Props {
  label: 'FROM' | 'TO';
  value: Selection;
  onChange: (next: Selection) => void;
  curated: CuratedSelections;
}

export function PairSelector({ label, value, onChange, curated }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover preload — by the time the user clicks, the index is usually warm.
  const handleHover = useCallback(() => {
    loadSearchIndex().catch(() => {});
  }, []);

  // Reset query on close and auto-focus input on open.
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

  // Debounced search.
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
      searchAll(q, 30)
        .then((r) => {
          setResults(r);
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

  const pick = useCallback(
    (sel: Selection) => {
      onChange(sel);
      setOpen(false);
    },
    [onChange],
  );

  const pickResult = useCallback(
    (r: SearchResult) => {
      const sel = selectionFromSearchResult(r);
      if (sel) pick(sel);
    },
    [pick],
  );

  const q = query.trim();
  const showCurated = q === '' && !loading;

  // Flat, ordered list of whatever rows are currently visible — curated
  // (zones then cities) when idle, search results when typing. This is what
  // ArrowUp/Down walk and Enter commits.
  const items: Selection[] | SearchResult[] = showCurated
    ? [...curated.zones, ...curated.cities]
    : results;

  const pickIndex = useCallback(
    (i: number) => {
      const item = items[i];
      if (!item) return;
      if (showCurated) pick(item as Selection);
      else pickResult(item as SearchResult);
    },
    [items, showCurated, pick, pickResult],
  );

  // When the visible list changes (open, typing, results arrive), highlight the
  // current selection if it's present, otherwise the first row.
  useEffect(() => {
    if (!open) return;
    const idx = showCurated
      ? [...curated.zones, ...curated.cities].findIndex((s) => s.id === value.id)
      : results.findIndex((r) => r.slug === value.id);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, showCurated, curated, results, value.id]);

  // Keep the highlighted row scrolled into view as the user arrows through it.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleInputKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(items.length - 1, i + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(0, i - 1));
          break;
        case 'Enter':
          e.preventDefault();
          pickIndex(activeIndex);
          break;
        case 'Escape':
          setOpen(false);
          break;
      }
    },
    [items.length, activeIndex, pickIndex],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={handleHover}
          aria-label={`${label === 'FROM' ? 'From' : 'To'}: ${value.name}`}
          className={cn(
            'group relative flex h-[68px] w-full flex-col items-start justify-end',
            'rounded-lg border border-[color:var(--border)] bg-[var(--card)] px-3.5 pb-2 pt-5 text-left',
            'transition-colors hover:border-[color:var(--border-strong)]',
            'data-[state=open]:border-[color:var(--brand)]',
            'data-[state=open]:shadow-[0_0_0_3px_var(--brand-soft)]',
          )}
        >
          <span className="absolute left-3.5 top-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--fg-subtle)]">
            {label}
          </span>
          <span className="truncate text-[17px] font-semibold leading-tight text-[color:var(--fg)]">
            {value.name}
          </span>
          <span className="mt-0.5 truncate font-mono text-[11.5px] text-[color:var(--fg-muted)]">
            {value.code} · {value.offsetLabel} · {value.country}
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
              placeholder="Search zones and cities…"
              aria-label="Search zones and cities"
              className={cn(
                'h-8 w-full rounded-md border border-[color:var(--border)] bg-[var(--input-bg)] pl-8 pr-2',
                'text-[13px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-subtle)]',
                'focus:border-[color:var(--brand)] focus:outline-none focus:shadow-[0_0_0_3px_var(--brand-soft)]',
              )}
            />
          </div>
        </div>

        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-1">
          {showCurated && (
            <CuratedGroups
              curated={curated}
              onPick={pick}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
            />
          )}

          {!showCurated && (
            <FilteredResults
              loading={loading}
              query={q}
              results={results}
              onPick={pickResult}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CuratedGroups({
  curated,
  onPick,
  activeIndex,
  onHover,
}: {
  curated: CuratedSelections;
  onPick: (sel: Selection) => void;
  activeIndex: number;
  onHover: (index: number) => void;
}) {
  // Zones and cities share one index space so keyboard nav flows across both.
  return (
    <>
      <GroupHeader>Time zones</GroupHeader>
      {curated.zones.map((s, i) => (
        <SelectionRow
          key={`z:${s.id}`}
          sel={s}
          index={i}
          active={i === activeIndex}
          onPick={onPick}
          onHover={onHover}
        />
      ))}
      <GroupHeader>Popular cities</GroupHeader>
      {curated.cities.map((s, i) => {
        const index = curated.zones.length + i;
        return (
          <SelectionRow
            key={`c:${s.id}`}
            sel={s}
            index={index}
            active={index === activeIndex}
            onPick={onPick}
            onHover={onHover}
          />
        );
      })}
    </>
  );
}

function FilteredResults({
  loading,
  query,
  results,
  onPick,
  activeIndex,
  onHover,
}: {
  loading: boolean;
  query: string;
  results: SearchResult[];
  onPick: (r: SearchResult) => void;
  activeIndex: number;
  onHover: (index: number) => void;
}) {
  if (loading && results.length === 0) {
    return <div className="px-3 py-2 text-[13px] text-[color:var(--fg-subtle)]">Searching…</div>;
  }
  if (results.length === 0) {
    return (
      <div className="px-3 py-2 text-[13px] text-[color:var(--fg-subtle)]">
        No results for &ldquo;{query}&rdquo;
      </div>
    );
  }
  return (
    <>
      <GroupHeader>
        {results.length} {results.length === 1 ? 'match' : 'matches'}
      </GroupHeader>
      {results.map((r, i) => (
        <ResultRow
          key={r.id}
          result={r}
          query={query}
          index={i}
          active={i === activeIndex}
          onPick={onPick}
          onHover={onHover}
        />
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

function SelectionRow({
  sel,
  index,
  active,
  onPick,
  onHover,
}: {
  sel: Selection;
  index: number;
  active: boolean;
  onPick: (sel: Selection) => void;
  onHover: (index: number) => void;
}) {
  const Icon = sel.kind === 'city' ? Building2 : Globe2;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-index={index}
      onClick={() => onPick(sel)}
      onMouseEnter={() => onHover(index)}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px]',
        'text-[color:var(--fg)] transition-colors',
        active ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--hover)]',
      )}
    >
      <Icon className="size-3.5 shrink-0 text-[color:var(--fg-subtle)]" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{sel.name}</span>
      <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--fg-subtle)]">
        {sel.offsetLabel.replace('UTC', '')}
      </span>
    </button>
  );
}

function ResultRow({
  result,
  query,
  index,
  active,
  onPick,
  onHover,
}: {
  result: SearchResult;
  query: string;
  index: number;
  active: boolean;
  onPick: (r: SearchResult) => void;
  onHover: (index: number) => void;
}) {
  const Icon = result.type === 'city' ? Building2 : Globe2;
  const offset = useMemo(() => offsetFromSecondary(result.display_secondary), [result]);
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-index={index}
      onClick={() => onPick(result)}
      onMouseEnter={() => onHover(index)}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px]',
        'text-[color:var(--fg)] transition-colors',
        active ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--hover)]',
      )}
    >
      <Icon className="size-3.5 shrink-0 text-[color:var(--fg-subtle)]" aria-hidden="true" />
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
