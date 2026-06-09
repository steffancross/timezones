'use client';

import { ArrowRight } from 'lucide-react';
import { convert } from '@/lib/smart-converter/convert';
import type { ResolvedEvent } from '@/lib/smart-converter/types';
import { Countdown } from './Countdown';
import { CopyButton } from './CopyButton';
import { Echo } from './Echo';
import { useCountdown } from './useCountdown';

interface Props {
  event: ResolvedEvent;
  targetIana: string;
  dense?: boolean;
}

/**
 * A range ("Sep 24–27") — Range cards.html option A: one card, the countdown
 * targets the START, with a resolved open→close span beneath and the duration.
 * (Option B / dual-rail is intentionally not built.)
 */
export function RangeCard({ event, targetIana, dense }: Props) {
  const r = convert(event, targetIana);
  const { parts, phrase } = useCountdown(r.startInstantMs);

  return (
    <div className={`sc-card${dense ? ' dense' : ''}`}>
      <Echo matchText={event.matchText} zoneToken={event.zoneTokenText} />
      <div className="sc-div" />

      <div className="sc-cd">
        <Countdown parts={parts} size={dense ? 27 : 33} label="until it opens" />
      </div>
      <div className={`sc-cd-cap${parts.past ? ' past' : ''}`}>
        <span className="cap-rel">
          {parts.past ? `opened ${phrase.replace('in ', '')}` : phrase}
        </span>
        <span className="dot" />
        <span>until it opens</span>
      </div>

      <div className="sc-div" />
      <div className="sc-r-span">
        <div className="sc-r-end">
          <div className="lab">
            <span className="pip open" />
            Opens · your time
          </div>
          <div className="d8">{r.startDate}</div>
          {r.startClock ? <div className="t8">{r.startClock}</div> : null}
        </div>
        <div className="sc-r-arrow">
          <ArrowRight size={18} aria-hidden="true" />
        </div>
        <div className="sc-r-end">
          <div className="lab">
            <span className="pip close" />
            Closes · your time
          </div>
          <div className="d8">{r.endDate}</div>
          {r.endClock ? <div className="t8">{r.endClock}</div> : null}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
        }}
      >
        <span className="sc-r-dur">
          {r.durationDays != null ? <span>runs {r.durationDays} days</span> : null}
          <span className="dot" />
          <span>
            {r.targetAbbr} · {r.targetOffsetLabel}
          </span>
        </span>
        <CopyButton value={`${r.startDate} – ${r.endDate} (${r.targetAbbr})`} />
      </div>
    </div>
  );
}
