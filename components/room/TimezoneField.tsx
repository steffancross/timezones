'use client';

// Timezone picker for the identity surfaces (spec 2). Reuses the app's existing
// MiniSearch index (searchAll) so a participant can type a city or zone name and
// store its IANA string. The contribute modal prefills it with the auto-detected
// zone; this field lets the visitor change it.

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchAll } from '@/lib/search/runtime';
import type { SearchResult } from '@/lib/search/types';

interface Props {
  value: string; // current IANA timezone
  detected?: string; // the auto-detected IANA, to show an "auto" badge when matched
  onChange: (iana: string) => void;
}

export function TimezoneField({ value, detected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  // Render readOnly until first focus: browsers skip autofill on readonly inputs.
  // This blocks autofill on load, but Firefox still pops its saved-logins dropdown
  // on focus because it pairs this box with the password field in the same Settings
  // form (and ignores autocomplete="off" for credential fields). The real fix is the
  // <form> boundary below: isolating this input in its own password-field-free form
  // gives Firefox's login manager nothing to attach to. We arm on focus so typing works.
  const [armed, setArmed] = useState(false);
  const wrapRef = useRef<HTMLFormElement>(null);

  // Debounced search (mirrors SearchInput's 80ms).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchAll(q, 6).then(setResults);
    }, 80);
    return () => clearTimeout(t);
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  function select(r: SearchResult) {
    onChange(r.iana);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  const isAuto = Boolean(detected && value === detected);

  return (
    // Own form (no password field) so Firefox's login manager won't render the
    // "manage passwords" dropdown over the results. onSubmit guards the Enter key.
    <form
      ref={wrapRef}
      className="relative"
      autoComplete="off"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Current:</span>
        <span className="text-sm font-medium">{value || 'none'}</span>
        {isAuto && (
          <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-secondary-foreground">
            auto
          </span>
        )}
      </div>
      <Input
        value={query}
        placeholder="Search a city or timezone…"
        // It's a search box, not a credential — keep browser/password-manager
        // autofill off so the "manage passwords" overlay doesn't cover results.
        type="search"
        readOnly={!armed}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setArmed(true);
          setOpen(true);
        }}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => select(r)}
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span>{r.display_name}</span>
              <span className="text-xs text-muted-foreground">{r.iana}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
