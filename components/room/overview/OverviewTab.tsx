'use client';

// Overview — the answer-first home glance (spec 6). Stacks the ranked meeting
// windows (the payoff), the live "right now" status, and an ambient per-zone clock
// list. Almost pure assembly on the spec-3 engine; it reads the SAME data the Team
// heatmap does, so headline and evidence can't disagree.
//
// Tick discipline: the heavy projection (`prepare`) is memoized on data/zone/week
// and never on `now`, so the minute tick only re-runs the cheap window ranking +
// live status — never a re-projection. Overview is pinned to the CURRENT week
// (independent of the Team tab's pageable weekAnchor); there's no week-view here.

import { useMemo } from 'react';
import {
  closestPartialTodayFrom,
  currentWeekAnchor,
  liveStatus,
  type MeetingWindow,
  prepare,
  todayWindowsFrom,
  weekWindowsFrom,
} from '@/lib/rooms/compute';
import { contentPhase, respondedParticipants } from '@/lib/rooms/content-state';
import { formatClock, formatTime } from '@/lib/time/format';
import { DateTime } from '@/lib/time/luxon';
import { JustYouSoFar } from '../JustYouSoFar';
import { RespondersNote } from '../RespondersNote';
import { RoomGetStarted } from '../RoomGetStarted';
import { useRoomStore } from '../room-store-context';
import { RightNow } from './RightNow';
import { ZoneClocks } from './ZoneClocks';

/** "a", "a & b", "a, b & c" */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function SubLine({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="mb-1 mt-3 flex items-baseline gap-2 whitespace-nowrap">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--brand)]">
        {label}
      </span>
      {meta && <span className="text-[12px] text-muted-foreground">{meta}</span>}
    </div>
  );
}

function WindowRow({
  w,
  viewerTz,
  total,
  nameById,
}: {
  w: MeetingWindow;
  viewerTz: string;
  total: number;
  nameById: Map<string, string>;
}) {
  const start = DateTime.fromMillis(w.startInstant).setZone(viewerTz);
  const end = DateTime.fromMillis(w.endInstant).setZone(viewerTz);
  const softNames = w.softPeople.map((id) => nameById.get(id) ?? id);
  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-0.5 text-sm"
      data-testid="window-row"
    >
      <span
        className="size-[7px] shrink-0 rounded-full"
        style={{ background: w.grade === 'all' ? 'var(--av-yes-strong)' : 'var(--av-soft-fill)' }}
      />
      <span className="font-medium">
        {start.toFormat('cccc')} · {formatTime(start, '12')}–{formatTime(end, '12')}
      </span>
      <span className="font-mono text-[10.5px] text-muted-foreground">
        {start.toFormat('ZZZZ')}
      </span>
      {w.grade === 'all' ? (
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide"
          style={{ background: 'var(--av-yes)', color: 'var(--av-yes-ink)' }}
        >
          all {total}
        </span>
      ) : (
        <span className="text-[12.5px] text-muted-foreground">
          — works if {listNames(softNames)} {softNames.length === 1 ? 'flexes' : 'flex'}
        </span>
      )}
    </div>
  );
}

export function OverviewTab({ onAddAvailability }: { onAddAvailability?: () => void }) {
  const state = useRoomStore((s) => s.state);
  const viewerTz = useRoomStore((s) => s.viewerTz);
  const selected = useRoomStore((s) => s.selected);
  const now = useRoomStore((s) => s.now);
  const youId = useRoomStore((s) => s.youId);

  // Pinned to the current week — NOT the store's (pageable) weekAnchor. The anchor
  // string is stable across minute ticks, so it's a sound memo key that only flips
  // at the week rollover.
  const weekAnchor = currentWeekAnchor(viewerTz, now);

  // The heavy half — memoized off `now` (prepare ignores `now`; the cores take it
  // separately), so a minute tick re-ranks but never re-projects.
  const prepared = useMemo(
    () => prepare({ room: state, viewerTz, weekAnchor, now: 0, selected: [...selected] }),
    [state, viewerTz, weekAnchor, selected],
  );

  // Cheap, per-tick.
  const week = weekWindowsFrom(prepared, now);
  const today = todayWindowsFrom(prepared, now, viewerTz);
  const partial = today.length === 0 ? closestPartialTodayFrom(prepared, now, viewerTz) : null;
  const status = liveStatus({ room: state, viewerTz, weekAnchor, now, selected: [...selected] });
  const total = prepared.projection.participants.length;

  const nameById = useMemo(
    () => new Map(state.participants.map((p) => [p.id, p.displayName])),
    [state.participants],
  );

  const viewer = DateTime.fromMillis(now).setZone(viewerTz);
  const responders = respondedParticipants(state.participants);
  const freeNames = status
    .filter((s) => s.state === 'y')
    .map((s) => nameById.get(s.participantId) ?? s.participantId);

  // Cold-start states (spec 7b): an empty room is a get-started; a one-responder
  // room shows their own status, never an "everyone overlaps" headline (the
  // windows for one person would be the same misleading all-green consensus).
  const phase = contentPhase(state.participants);
  const you = youId ? state.participants.find((p) => p.id === youId) : undefined;

  if (phase === 'empty') {
    return (
      <div className="flex flex-col gap-6 p-4">
        <RoomGetStarted onAddAvailability={onAddAvailability} />
      </div>
    );
  }

  if (phase === 'solo') {
    return (
      <div className="flex flex-col gap-6 p-4">
        <JustYouSoFar youResponded={!!you?.hasResponded} onAddAvailability={onAddAvailability} />
        <section className="flex flex-col-reverse gap-5 md:flex-row md:gap-8">
          <div className="min-w-0 flex-1">
            <Eyebrow>Local time now</Eyebrow>
            <ZoneClocks participants={state.participants} now={now} />
          </div>
          <div className="md:w-60">
            <RightNow status={status} nameById={nameById} participants={state.participants} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Answer block */}
      <section>
        <Eyebrow>When you overlap</Eyebrow>
        <div className="mt-1.5">
          <RespondersNote count={responders.length} />
        </div>

        <SubLine label="This week" meta="best windows" />
        {week.length > 0 ? (
          <div className={week.length === 4 ? 'grid grid-cols-2' : ''}>
            {week.map((w) => (
              <WindowRow
                key={`${w.day}-${w.startSlot}`}
                w={w}
                viewerTz={viewerTz}
                total={total}
                nameById={nameById}
              />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No full-overlap windows left this week.
          </p>
        )}

        <SubLine label={`Today · ${viewer.toFormat('ccc')}`} />
        {today.length > 0 ? (
          today.map((w) => (
            <WindowRow
              key={`${w.day}-${w.startSlot}`}
              w={w}
              viewerTz={viewerTz}
              total={total}
              nameById={nameById}
            />
          ))
        ) : (
          <p
            className="text-[13px] leading-relaxed text-muted-foreground"
            data-testid="today-fallback"
          >
            {partial
              ? (() => {
                  const outNames = partial.outParticipants.map((id) => nameById.get(id) ?? id);
                  const time = formatClock(
                    Math.floor(partial.slot / 2),
                    (partial.slot % 2) * 30,
                    '12',
                  );
                  return (
                    <>
                      No full overlap left today — closest is{' '}
                      <b className="font-semibold text-foreground">
                        {time} {viewer.toFormat('ZZZZ')}
                      </b>
                      , but {listNames(outNames)} {outNames.length === 1 ? 'is' : 'are'} out.
                    </>
                  );
                })()
              : 'No full overlap left today.'}
            {freeNames.length > 0 && (
              <>
                {' '}
                {listNames(freeNames)} {freeNames.length === 1 ? 'is' : 'are'} around now.
              </>
            )}
          </p>
        )}
      </section>

      {/* Clocks + right-now split */}
      <section className="flex flex-col gap-5 md:flex-row md:gap-8">
        <div className="min-w-0 flex-1">
          <Eyebrow>Local time now</Eyebrow>
          <ZoneClocks participants={state.participants} now={now} />
        </div>
        <div className="md:w-60">
          <RightNow status={status} nameById={nameById} participants={state.participants} />
        </div>
      </section>
    </div>
  );
}
