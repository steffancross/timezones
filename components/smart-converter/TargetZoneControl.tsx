'use client';

import { ChevronDown, Globe } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { SearchInput } from '@/components/converter/SearchInput';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { currentAbbreviation } from '@/lib/zones/abbreviation';
import { formatUtcOffset } from '@/lib/zones/offset';
import { zoneDisplayNameForIana } from '@/lib/zones/resolve';

interface Props {
  targetIana: string;
  onChange: (iana: string) => void;
}

/** The "Showing in your time" chip — opens a searchable zone picker (reuses SearchInput). */
export function TargetZoneControl({ targetIana, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const name = zoneDisplayNameForIana(targetIana);
  const abbr = currentAbbreviation(targetIana);
  const offset = formatUtcOffset(DateTime.now().setZone(targetIana).offset);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="sc-tz" type="button" aria-label="Change the time zone you're viewing in">
          <span className="tz-ico">
            <Globe size={16} aria-hidden="true" />
          </span>
          <span className="tz-body">
            <span className="tz-cap">Showing in your time</span>
            <span className="tz-name">
              {name}
              <span className="tz-meta">
                {abbr} · {offset}
              </span>
            </span>
          </span>
          <span className="tz-caret">
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
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
