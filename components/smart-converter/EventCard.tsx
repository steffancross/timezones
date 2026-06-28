'use client';

import { convert } from '@/lib/smart-converter/convert';
import type { ResolvedEvent } from '@/lib/smart-converter/types';
import { Countdown } from './Countdown';
import { CopyButton } from './CopyButton';
import { Echo } from './Echo';
import { useCountdown } from './useCountdown';

interface Props {
  event: ResolvedEvent;
  targetIana: string;
  idx?: number;
  total?: number;
  dense?: boolean;
}

/** Resolved single event — the locked countdown-forward card (Direction A). */
export function EventCard({ event, targetIana, idx = 1, total = 1, dense }: Props) {
  const r = convert(event, targetIana);
  const { parts, phrase } = useCountdown(r.startInstantMs);
  const [clock, ap] = r.startClock.split(' ');
  const assumed = event.zone.kind === 'target';

  return (
    <div className={`sc-card${dense ? ' dense' : ''}`}>
      <Echo matchText={event.matchText} zoneToken={event.zoneTokenText} />
      <div className="sc-div" />

      {total > 1 ? (
        <div className="sc-evlabel">
          <span className="ev-dot" />
          <span className="ev-name">Event</span>
          <span className="ev-idx">
            {idx} of {total}
          </span>
        </div>
      ) : null}

      <div className="sc-cd">
        <Countdown parts={parts} size={dense ? 27 : 33} label="until this event" />
      </div>
      <div className={`sc-cd-cap${parts.past ? ' past' : ''}`}>
        <span className="cap-rel">
          {parts.past ? `happened ${phrase.replace('in ', '')}` : phrase}
        </span>
      </div>

      <div className="sc-div" />
      <div className="sc-conv">
        <div className="conv-main">
          <div className="conv-date-lg">{r.startDate}</div>
          <div className="conv-timerow">
            {clock ? (
              <span className="conv-time-lg">
                {clock}
                {ap ? <span className="ap">{ap.toUpperCase()}</span> : null}
              </span>
            ) : (
              <span className="conv-meta">all day</span>
            )}
            <span className="you">your time</span>
            <span className="conv-meta">
              {r.targetAbbr} · {r.targetOffsetLabel}
            </span>
          </div>
          {assumed ? (
            <div className="sc-assumed">
              Assumed <strong>your time</strong> — no zone was stated. Change the zone above to
              correct.
            </div>
          ) : null}
        </div>
        <CopyButton value={`${r.startDate}${clock ? `, ${r.startClock}` : ''} (${r.targetAbbr})`} />
      </div>
      <div className="sc-src">
        <span>stated as {r.sourceLabel}</span>
      </div>
    </div>
  );
}
