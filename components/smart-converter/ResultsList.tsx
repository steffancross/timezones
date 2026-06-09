'use client';

import type { ParsedEvent } from '@/lib/smart-converter/types';
import { AmbiguousCard } from './AmbiguousCard';
import { EventCard } from './EventCard';
import { RangeCard } from './RangeCard';
import { UnknownCard } from './UnknownCard';

interface Props {
  events: ParsedEvent[];
  targetIana: string;
  onPin: (key: string, iana: string) => void;
  onEnterManually: () => void;
}

const keyOf = (e: ParsedEvent) => `${e.matchIndex}:${e.matchText}`;

export function ResultsList({ events, targetIana, onPin, onEnterManually }: Props) {
  const resolvable = events.filter((e) => e.status !== 'unknown').length;
  const total = events.filter((e) => e.status === 'resolved' || e.status === 'ambiguous').length;

  return (
    <>
      <div className="sc-results-head">
        <span className="rh-title">Results</span>
        <span className="rh-sub">
          {resolvable} event{resolvable === 1 ? '' : 's'} · your time
        </span>
      </div>
      <div className="sc-results">
        {events.map((e, i) => {
          const key = keyOf(e);
          if (e.status === 'unknown') {
            return <UnknownCard key={key} event={e} onEnterManually={onEnterManually} />;
          }
          if (e.status === 'ambiguous') {
            return (
              <AmbiguousCard
                key={key}
                event={e}
                targetIana={targetIana}
                onPick={(iana) => onPin(key, iana)}
              />
            );
          }
          const dense = total > 1;
          return e.hasRange ? (
            <RangeCard key={key} event={e} targetIana={targetIana} dense={dense} />
          ) : (
            <EventCard
              key={key}
              event={e}
              targetIana={targetIana}
              idx={i + 1}
              total={total}
              dense={dense}
            />
          );
        })}
      </div>
    </>
  );
}
