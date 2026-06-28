'use client';

// Timezone picker for the identity surfaces. Matches the smart-converter pattern:
// a trigger showing the current zone opens a Popover with SearchInput.

import { ChevronDown } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { SearchInput } from '@/components/converter/SearchInput';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { currentAbbreviation } from '@/lib/zones/abbreviation';
import { formatUtcOffset } from '@/lib/zones/offset';
import { zoneDisplayNameForIana } from '@/lib/zones/resolve';

interface Props {
  value: string;
  detected?: string;
  onChange: (iana: string) => void;
}

export function TimezoneField({ value, detected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const name = zoneDisplayNameForIana(value);
  const abbr = currentAbbreviation(value);
  const offset = formatUtcOffset(DateTime.now().setZone(value).offset);
  const isAuto = Boolean(detected && value === detected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm hover:bg-accent"
        >
          <span className="flex-1 min-w-0 truncate font-medium">{name}</span>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {abbr} · {offset}
          </span>
          {isAuto && (
            <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-secondary-foreground">
              auto
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <SearchInput
          placeholder="Search your city or time zone"
          onSelect={(r) => {
            onChange(r.iana);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
