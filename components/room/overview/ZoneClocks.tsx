'use client';

// Ambient per-zone clocks (spec 6 §3). NOT a Converter drop-in — just a list of
// current-time clocks for each UNIQUE responder timezone, with member avatar chips.
// No viewer-relative offset; the zone label/abbrev come from Luxon's offset names
// (robust for arbitrary room IANA zones, which curated zone slugs wouldn't cover).

import type { PublicParticipant } from '@/lib/rooms/db';
import { formatTime } from '@/lib/time/format';
import { DateTime } from '@/lib/time/luxon';
import { Avatar } from '../Avatar';

interface Props {
  /** All participants — clocks show anyone who has set a timezone, responded or not. */
  participants: PublicParticipant[];
  /** Store's ticking `now` (ms) so clocks update with the minute tick. */
  now: number;
}

/** Friendly zone name + abbrev from Luxon offset names, de-duped for offset-only zones. */
function zoneLabel(dt: DateTime): { name: string; abbrev: string | null } {
  const short = dt.toFormat('ZZZZ'); // "EST" / "GMT+9"
  const long = dt.toFormat('ZZZZZ'); // "Eastern Standard Time" / "Japan Standard Time"
  const friendly = long.replace(/ (Standard|Daylight) Time$/, '');
  // When Luxon only has an offset form, don't render "GMT+9 · GMT+9".
  if (friendly === short || friendly.startsWith('GMT') || friendly.startsWith('UTC')) {
    return { name: short, abbrev: null };
  }
  return { name: friendly, abbrev: short };
}

type ZoneRow = { tz: string; members: PublicParticipant[]; offset: number };

function groupByZone(participants: PublicParticipant[], now: number): ZoneRow[] {
  const byTz = new Map<string, PublicParticipant[]>();
  for (const p of participants) {
    const list = byTz.get(p.timezone);
    if (list) list.push(p);
    else byTz.set(p.timezone, [p]);
  }
  return [...byTz.entries()]
    .map(([tz, members]) => ({
      tz,
      members,
      offset: DateTime.fromMillis(now).setZone(tz).offset,
    }))
    .sort((a, b) => a.offset - b.offset); // west → east
}

export function ZoneClocks({ participants, now }: Props) {
  const rows = groupByZone(participants, now);

  return (
    <div className="flex flex-col">
      {rows.map((row) => {
        const dt = DateTime.fromMillis(now).setZone(row.tz);
        const { name, abbrev } = zoneLabel(dt);
        return (
          <div
            key={row.tz}
            data-testid="zone-clock"
            className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0"
          >
            <span className="flex">
              {row.members.map((m) => (
                <span key={m.id} className="-ml-1.5 first:ml-0">
                  <Avatar id={m.id} name={m.displayName} size="sm" />
                </span>
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold tracking-tight">
                {name}
                {abbrev && <span className="ml-1 text-muted-foreground">· {abbrev}</span>}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {row.members.map((m) => m.displayName).join(', ')}
              </span>
            </span>
            <span className="ml-auto font-mono text-[17px] font-bold tabular-nums">
              {formatTime(dt, '12')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
