'use client';

import { Building2, Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/lib/search/types';

interface Props {
  result: SearchResult;
  active: boolean;
  index: number;
  query: string;
  onSelect: (result: SearchResult) => void;
  onHover: () => void;
}

export function SearchResultItem({ result, active, index, query, onSelect, onHover }: Props) {
  const Icon = result.type === 'city' ? Building2 : Globe2;
  const offsetText = extractOffset(result.display_secondary);

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-result-index={index}
      onClick={() => onSelect(result)}
      onMouseEnter={onHover}
      // Prevent the input from blurring before our click handler fires —
      // standard combobox pattern.
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-1.5 text-left text-[13px] transition-colors',
        active
          ? 'bg-[var(--brand-soft)] text-[color:var(--fg)]'
          : 'hover:bg-[var(--hover)] text-[color:var(--fg)]',
      )}
    >
      <Icon className="size-4 shrink-0 text-[color:var(--fg-subtle)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-[color:var(--fg)] truncate">
          {highlightMatch(result.display_name, query)}
        </div>
        <div className="text-[11px] text-[color:var(--fg-subtle)] truncate">
          {result.display_secondary}
        </div>
      </div>
      {offsetText && (
        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--fg-subtle)]">
          {offsetText}
        </span>
      )}
    </button>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-[color:var(--fg)]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/**
 * Pull a "+9" or "-8" style offset suffix out of the display_secondary if
 * present. The build-search-index script formats it as part of the secondary
 * label; here we surface it as the right-aligned meta column.
 */
function extractOffset(secondary: string): string | null {
  const m = secondary.match(/(GMT[+-]?\d+(?::\d+)?|UTC[+-]?\d+(?::\d+)?|[+-]\d+(?::\d+)?$)/);
  return m ? m[0] : null;
}
