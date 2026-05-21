'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchResult } from '@/lib/search/types';
import { cn } from '@/lib/utils';
import { SearchResultItem } from './SearchResultItem';

interface Props {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onSelect: (result: SearchResult) => void;
}

export function SearchDropdown({ results, loading, query, onSelect }: Props) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset active highlight when result set changes.
  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  // Keyboard nav. Listen on the document but only act when focus is inside the
  // wrapping search-input cluster.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const root = containerRef.current?.parentElement;
      if (!root?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(results.length - 1, i + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(0, i - 1));
          break;
        case 'Enter':
          if (activeIndex >= 0 && results[activeIndex]) {
            e.preventDefault();
            onSelect(results[activeIndex]);
          }
          break;
        case 'Escape':
          (document.activeElement as HTMLElement | null)?.blur();
          break;
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [results, activeIndex, onSelect]);

  // Scroll the active item into view when changed.
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = containerRef.current?.querySelector(`[data-result-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!query.trim() && !loading) return null;

  const showLoading = loading && results.length === 0;
  const showNoResults = !loading && results.length === 0 && query.trim() !== '';

  return (
    <div
      ref={containerRef}
      id="search-dropdown"
      role="listbox"
      aria-label="Search results"
      className={cn(
        'absolute left-0 right-0 top-full z-40 mt-1.5 p-1',
        'rounded-[var(--radius-lg,6px)] border border-[color:var(--border)] bg-card shadow-lg',
        'max-h-80 overflow-y-auto',
      )}
    >
      {results.length > 0 && (
        <div className="px-2.5 pt-1.5 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]">
          Zones &amp; cities
        </div>
      )}

      {showLoading && (
        <div className="px-3 py-2 text-[13px] text-[color:var(--fg-subtle)]">Searching…</div>
      )}

      {showNoResults && (
        <div className="px-3 py-2 text-[13px] text-[color:var(--fg-subtle)]">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}

      {results.map((result, i) => (
        <SearchResultItem
          key={result.id}
          result={result}
          active={i === activeIndex}
          index={i}
          query={query}
          onSelect={onSelect}
          onHover={() => setActiveIndex(i)}
        />
      ))}
    </div>
  );
}
