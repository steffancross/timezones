'use client';

// The Availability tab (spec 5): paint your OWN week in your OWN timezone (no
// projection). A "General" recurring template plus per-week overrides. Lurkers
// get the contribute modal first, then paint; the first save flips them to
// responded. Saves are optimistic + debounced (useAvailabilitySave).

import { ContributeModal } from '@/components/room/ContributeModal';
import { RecoveryPicker } from '@/components/room/RecoveryPicker';
import { useRoomStore } from '@/components/room/room-store-context';
import { buildWeekColumns } from '@/components/room/team/slots';
import { Button } from '@/components/ui/button';
import { displayColToDow, parseDay, parseWeek, type SlotState } from '@/lib/rooms/blob';
import { currentWeekAnchor } from '@/lib/rooms/compute';
import { WEEKDAY_LABELS } from '@/lib/time/calendar';
import { DateTime } from '@/lib/time/luxon';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type CellInfo, EditGrid } from './EditGrid';
import { PaintPalette } from './PaintPalette';
import { useAvailabilitySave } from './useAvailabilitySave';
import { WeekPicker } from './WeekPicker';

const emptyWeekSlots = (): SlotState[] => Array<SlotState>(336).fill('n');
const weekRangeLabel = (anchor: string) => {
  const s = DateTime.fromISO(anchor);
  const e = s.plus({ days: 6 });
  return s.month === e.month
    ? `${s.toFormat('MMM d')}–${e.toFormat('d')}`
    : `${s.toFormat('MMM d')} – ${e.toFormat('MMM d')}`;
};

const SAVE_LABEL: Record<string, string> = {
  unsaved: 'Unsaved',
  saving: 'Saving…',
  saved: 'Saved',
};

export function AvailabilityTab() {
  const roomId = useRoomStore((s) => s.state.room.id);
  const youId = useRoomStore((s) => s.youId);
  const participants = useRoomStore((s) => s.state.participants);
  const viewerTz = useRoomStore((s) => s.viewerTz);
  const now = useRoomStore((s) => s.now);
  const becomeParticipant = useRoomStore((s) => s.becomeParticipant);

  const { status, save } = useAvailabilitySave(roomId);

  const [mode, setMode] = useState<'general' | 'week'>('general');
  const [paint, setPaint] = useState<SlotState>('y');
  const [week, setWeek] = useState<SlotState[]>(emptyWeekSlots);
  const [overrides, setOverrides] = useState<Record<string, SlotState[]>>({});
  const [overrideAnchor, setOverrideAnchor] = useState(() => currentWeekAnchor(viewerTz, now));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(true);

  // Seed the draft from your committed blob once (per identity).
  const seededRef = useRef<string | null>(null);
  const skipSaveRef = useRef(false);
  useEffect(() => {
    if (!youId || seededRef.current === youId) return;
    const you = participants.find((p) => p.id === youId);
    if (!you) return;
    seededRef.current = youId;
    skipSaveRef.current = true;
    setWeek(you.generalWeek ? parseWeek(you.generalWeek) : emptyWeekSlots());
    const ov: Record<string, SlotState[]> = {};
    for (const [date, day] of Object.entries(you.overrides)) ov[date] = parseDay(day);
    setOverrides(ov);
  }, [youId, participants]);

  // Persist on edit (skip the seed-triggered run).
  // biome-ignore lint/correctness/useExhaustiveDependencies: save is stable; intentional edit-only trigger
  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (youId) save(week, overrides);
  }, [week, overrides, youId]);

  const weekColumns = useMemo(() => buildWeekColumns(overrideAnchor), [overrideAnchor]);

  const generalColumns = WEEKDAY_LABELS.map((label, i) => ({
    label,
    weekend: i === 0 || i === 6,
  }));

  const generalCell = (col: number, slot: number): CellInfo => ({
    state: week[displayColToDow(col) * 48 + slot] ?? 'n',
    ghost: false,
    changed: false,
  });

  const overrideCell = (col: number, slot: number): CellInfo => {
    const wc = weekColumns[col];
    if (!wc) return { state: 'n', ghost: true, changed: false };
    const tpl = week[displayColToDow(col) * 48 + slot] ?? 'n';
    const day = overrides[wc.iso];
    if (day) {
      const state = day[slot] ?? 'n';
      const changed = state !== tpl;
      // Only show full paint on cells that actually differ from the template;
      // unchanged cells stay dimmed (ghost) so the column doesn't light up whole.
      return { state, ghost: !changed, changed };
    }
    return { state: tpl, ghost: true, changed: false };
  };

  const paintGeneral = (col: number, slot: number) =>
    setWeek((prev) => {
      const next = [...prev];
      next[displayColToDow(col) * 48 + slot] = paint;
      return next;
    });

  const paintOverride = (col: number, slot: number) => {
    const wc = weekColumns[col];
    if (!wc) return;
    const dow = displayColToDow(col);
    setOverrides((prev) => {
      const day = prev[wc.iso]
        ? [...(prev[wc.iso] as SlotState[])]
        : week.slice(dow * 48, dow * 48 + 48);
      day[slot] = paint;
      return { ...prev, [wc.iso]: day };
    });
  };

  const resetOverrideWeek = () =>
    setOverrides((prev) => {
      const next = { ...prev };
      for (const c of weekColumns) delete next[c.iso];
      return next;
    });

  // Lurker: join first.
  if (!youId) {
    return (
      <div className="p-4">
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          Join the room to paint your availability.
          <Button size="sm" onClick={() => setJoinOpen(true)}>
            Join the room
          </Button>
        </div>
        <ContributeModal
          open={joinOpen && !recoverOpen}
          onOpenChange={setJoinOpen}
          roomId={roomId}
          onJoined={(p) => becomeParticipant(p, p.id)}
          onRecover={() => setRecoverOpen(true)}
        />
        <RecoveryPicker
          open={recoverOpen}
          onOpenChange={setRecoverOpen}
          roomId={roomId}
          onClaimed={(id) => {
            const p = participants.find((x) => x.id === id);
            if (p) becomeParticipant(p, id);
            setRecoverOpen(false);
          }}
          onNew={() => setRecoverOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 max-md:pb-28">
      <div className="mb-3 flex items-center gap-3">
        <div>
          <div className="text-sm font-semibold">
            {mode === 'general' ? 'My general week' : 'Override a week'}
          </div>
          <div className="text-xs text-muted-foreground">
            {mode === 'general'
              ? "Paint when you're usually free — your default every week."
              : 'Adjust one week; your general week shows faintly underneath.'}
          </div>
        </div>
        <span className="flex-1" />
        {status !== 'idle' && (
          <span className="font-mono text-[11px] text-muted-foreground">{SAVE_LABEL[status]}</span>
        )}
        <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
          {(['general', 'week'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'px-2.5 py-1',
                mode === m ? 'bg-[var(--brand)] text-[var(--brand-fg)]' : 'hover:bg-[var(--hover)]',
              )}
            >
              {m === 'general' ? 'General' : 'A week'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'week' && (
        <div className="relative mb-2 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-xs hover:bg-[var(--hover)]"
            onClick={() => setPickerOpen((o) => !o)}
          >
            Week of {weekRangeLabel(overrideAnchor)}
          </button>
          <button
            type="button"
            className="rounded-md px-2.5 py-1 text-xs text-[var(--brand)] hover:bg-[var(--hover)]"
            onClick={resetOverrideWeek}
          >
            Reset to general week
          </button>
          {pickerOpen && (
            <>
              {/* biome-ignore lint/a11y/noStaticElementInteractions: click-outside backdrop */}
              <div
                role="presentation"
                className="fixed inset-0 z-20"
                onClick={() => setPickerOpen(false)}
              />
              <div className="absolute top-full left-0 z-30 mt-1.5">
                <WeekPicker
                  value={overrideAnchor}
                  floor={currentWeekAnchor(viewerTz, now)}
                  onSelect={(sunday) => {
                    setOverrideAnchor(sunday);
                    setPickerOpen(false);
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'general' ? (
        <EditGrid columns={generalColumns} cellInfo={generalCell} onPaint={paintGeneral} />
      ) : (
        <EditGrid
          columns={weekColumns.map((c) => ({
            label: c.label,
            dayNum: c.dayNum,
            weekend: c.weekend,
          }))}
          cellInfo={overrideCell}
          onPaint={paintOverride}
        />
      )}

      {/* Desktop: inline below the grid. Mobile: a fixed bottom action bar that
          sits just above the bottom tab nav. */}
      <div className="mt-3 max-md:fixed max-md:inset-x-0 max-md:bottom-14 max-md:z-40 max-md:mt-0 max-md:border-t max-md:border-border max-md:bg-[hsl(var(--card))] max-md:p-3">
        <PaintPalette active={paint} onChange={setPaint} />
      </div>
    </div>
  );
}
