'use client';

import { formatUtcOffset } from '@/lib/zones/offset';
import { convert } from '@/lib/smart-converter/convert';
import type { AmbiguousEvent, ResolvedEvent } from '@/lib/smart-converter/types';
import { DateTime } from 'luxon';
import { Echo } from './Echo';

interface Props {
  event: AmbiguousEvent;
  targetIana: string;
  /** Promote this event to a resolved card pinned to the chosen zone. */
  onPick: (iana: string) => void;
}

/**
 * Ambiguous abbreviation — a "needs input" card with no guessed time. Each
 * candidate previews what YOUR local time would be if that's the right zone, so
 * the difference is visible; picking one resolves the card.
 */
export function AmbiguousCard({ event, targetIana, onPick }: Props) {
  return (
    <div className="sc-card needs-input">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Echo matchText={event.matchText} zoneToken={event.token} />
        <span className="sc-amb-flag" style={{ flexShrink: 0 }}>
          needs input
        </span>
      </div>
      <div className="sc-amb-q">
        Which <span className="q-accent">{event.token}</span> did they mean?
      </div>
      <div className="sc-amb-hint">
        “{event.token}” maps to {event.candidates.length} zones. Pick one and we'll convert — we
        won't guess.
      </div>
      <div className="sc-amb-opts">
        {event.candidates.map((c) => {
          const synthetic: ResolvedEvent = {
            ...event,
            status: 'resolved',
            zone: { kind: 'named', zone: c, iana: c.iana },
            end: null,
            hasRange: false,
          };
          const r = convert(synthetic, targetIana);
          const srcOffset = DateTime.fromObject(
            {
              year: event.start.year,
              month: event.start.month,
              day: event.start.day,
              hour: event.start.hour,
              minute: event.start.minute,
            },
            { zone: c.iana },
          ).offset;
          const weekday = r.startDate.split(',')[0]?.slice(0, 3) ?? '';
          return (
            <button className="sc-amb-opt" type="button" key={c.id} onClick={() => onPick(c.iana)}>
              <span>
                <span className="opt-zone">{c.display_name}</span>{' '}
                <span className="opt-region">{c.region}</span>
              </span>
              <span className="opt-time">
                <span className="ot-clock">
                  {weekday} {r.startClock || 'all day'}
                </span>
                <span className="ot-off">{formatUtcOffset(srcOffset)} · your time</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
