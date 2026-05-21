'use client';

import { Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { loadSearchIndex, searchAll } from '@/lib/search/runtime';
import { cn } from '@/lib/utils';
import { SearchDropdown } from './SearchDropdown';
import type { SearchResult } from '@/lib/search/types';

interface Props {
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  onSelect,
  placeholder = 'Add time zone, city, or town',
  className,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover-preload the index so by the time the user clicks the input, the
  // search engine is usually warm.
  const handleHover = useCallback(() => {
    loadSearchIndex().catch(() => {});
  }, []);

  const handleFocus = useCallback(() => {
    loadSearchIndex().catch(() => {});
    setOpen(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && wrapperRef.current?.contains(next)) return;
    setOpen(false);
  }, []);

  // Debounced search execution.
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
      searchAll(q, 8)
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

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      setQuery('');
      setResults([]);
      // Keep focus on the input AND `open` true, so the next keystroke renders
      // the dropdown immediately. Don't call setOpen(false) here — refocusing
      // a still-focused input won't re-fire onFocus, so flipping open back to
      // true would require a manual blur+refocus from the user.
      inputRef.current?.focus();
    },
    [onSelect],
  );

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--fg-subtle)]"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleHover}
        placeholder={placeholder}
        className="h-8 pl-9 text-[13px] bg-[var(--input-bg)] placeholder:text-[color:var(--fg-subtle)]"
        aria-label="Search time zones and cities"
        aria-autocomplete="list"
        aria-expanded={open && (results.length > 0 || loading)}
        aria-controls="search-dropdown"
        role="combobox"
      />

      {open && (
        <SearchDropdown
          results={results}
          loading={loading}
          query={query}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
