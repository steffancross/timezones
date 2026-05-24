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
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Enter selects the first result when typing.
  const handleInputKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && results[0]) {
        e.preventDefault();
        pickResult(results[0]);
      }
    },
    [results, pickResult],
  );

  const q = query.trim();
  const showCurated = q === '' && !loading;

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

        <div className="max-h-[320px] overflow-y-auto p-1">
          {showCurated && <CuratedGroups curated={curated} onPick={pick} activeId={value.id} />}

          {!showCurated && (
            <FilteredResults
              loading={loading}
              query={q}
              results={results}
              onPick={pickResult}
              activeId={value.id}
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
  activeId,
}: {
  curated: CuratedSelections;
  onPick: (sel: Selection) => void;
  activeId: string;
}) {
  return (
    <>
      <GroupHeader>Time zones</GroupHeader>
      {curated.zones.map((s) => (
        <SelectionRow key={`z:${s.id}`} sel={s} active={s.id === activeId} onPick={onPick} />
      ))}
      <GroupHeader>Popular cities</GroupHeader>
      {curated.cities.map((s) => (
        <SelectionRow key={`c:${s.id}`} sel={s} active={s.id === activeId} onPick={onPick} />
      ))}
    </>
  );
}

function FilteredResults({
  loading,
  query,
  results,
  onPick,
  activeId,
}: {
  loading: boolean;
  query: string;
  results: SearchResult[];
  onPick: (r: SearchResult) => void;
  activeId: string;
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
          active={r.slug === activeId || (i === 0 && activeId !== r.slug)}
          onPick={onPick}
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
  active,
  onPick,
}: {
  sel: Selection;
  active: boolean;
  onPick: (sel: Selection) => void;
}) {
  const Icon = sel.kind === 'city' ? Building2 : Globe2;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onPick(sel)}
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
  active,
  onPick,
}: {
  result: SearchResult;
  query: string;
  active: boolean;
  onPick: (r: SearchResult) => void;
}) {
  const Icon = result.type === 'city' ? Building2 : Globe2;
  const offset = useMemo(() => offsetFromSecondary(result.display_secondary), [result]);
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onPick(result)}
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
