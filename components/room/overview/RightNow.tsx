'use client';

// "Right now" — each responder's live status (spec 6 §2). Driven off liveStatus()
// (NOT the roster): it's responder-only and selection-independent by design, and
// recomputes cheaply on the minute tick (no projection). Inferred states ("probably
// free") render muted + tagged; out people recede.

import type { LiveStatus } from '@/lib/rooms/compute';
import type { PublicParticipant } from '@/lib/rooms/db';
import { cn } from '@/lib/utils';
import { Avatar } from '../Avatar';

const LABEL: Record<LiveStatus['state'], string> = { y: 'Free', s: 'If needed', n: 'Out' };
const DOT: Record<LiveStatus['state'], string> = {
  y: 'var(--st-free)',
  s: 'var(--st-soft)',
  n: 'var(--st-busy)',
};

interface Props {
  status: LiveStatus[];
  nameById: Map<string, string>;
  participants?: PublicParticipant[];
}

export function RightNow({ status, nameById, participants }: Props) {
  const respondedIds = new Set(status.map((s) => s.participantId));
  const unresponded = participants?.filter((p) => !respondedIds.has(p.id)) ?? [];

  return (
    <div className="flex flex-col gap-px">
      <div className="px-0.5 pb-2 font-mono text-[9px] uppercase tracking-[0.09em] text-muted-foreground">
        Right now
      </div>
      {status.map((s) => {
        const name = nameById.get(s.participantId) ?? s.participantId;
        return (
          <div
            key={s.participantId}
            data-testid="rn-item"
            data-state={s.state}
            data-inferred={String(s.inferred)}
            className={cn('flex items-center gap-2 px-0.5 py-1.5', s.state === 'n' && 'opacity-50')}
          >
            <Avatar id={s.participantId} name={name} size="sm" />
            <span
              className={cn('text-[12.5px] font-medium', s.inferred && 'text-muted-foreground')}
            >
              {name}
            </span>
            <span
              className="ml-auto size-2 shrink-0 rounded-full"
              style={{ background: DOT[s.state] }}
            />
            <span className="w-14 text-right font-mono text-[8.5px] uppercase tracking-wide text-muted-foreground">
              {s.inferred && s.state !== 'n' ? 'inferred' : LABEL[s.state]}
            </span>
          </div>
        );
      })}
      {unresponded.map((p) => (
        <div key={p.id} className="flex items-center gap-2 px-0.5 py-1.5 opacity-50">
          <Avatar id={p.id} name={p.displayName} size="sm" />
          <span className="text-[12.5px] font-medium">{p.displayName}</span>
          <span className="ml-auto rounded bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            hasn&apos;t filled
          </span>
        </div>
      ))}
    </div>
  );
}
