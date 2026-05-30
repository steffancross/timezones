import { DateTime } from 'luxon';
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TimeFormat } from '@/lib/time/format';
import { DEFAULT_WORKING_HOURS, type WorkingHours } from '@/lib/time/working-hours';

export interface ZoneRef {
  kind: 'zone' | 'city';
  slug: string;
  iana: string;
}

export interface ConverterState {
  zones: ZoneRef[];

  /**
   * Index into `zones` of the anchor zone — the zone whose local time
   * `anchorHour` and `anchorDate` are expressed in. On pair pages this is
   * always 0 (the URL's "from" zone). null = no anchor.
   *
   * NOT the user's local zone — that's a separate "your local" indicator
   * added by the page route via cf-timezone (see G3).
   */
  homeZoneIndex: number | null;

  anchorDate: string;
  /**
   * Snapshot of what `anchorDate` would be if auto-derived right now — updated
   * any time we set `anchorDate` from `todayInZone(home)` (init, addZone first,
   * setZones, clearRange, resetAll). Components compare against this instead
   * of calling `todayInZone()` at render time, which avoids hydration
   * mismatches when SSR (UTC) and client (local) disagree on "today" near
   * midnight.
   */
  defaultAnchorDate: string;
  /**
   * Range selected on the strip, expressed as the home zone's local-hour
   * column indices (both inclusive). `rangeStart` and `rangeEnd` define the
   * leftmost and rightmost columns covered; a 1-tile click sets them equal.
   *
   * When `rangeEnd` is null, the block is treated as 1 tile wide at
   * `rangeStart` — keeps URL-sync paths that only know the start working
   * without a separate width field.
   */
  rangeStart: number | null;
  rangeEnd: number | null;
  previewHour: number | null;

  format: TimeFormat;

  /**
   * Strip overlays. All three are independent — any combination can be on
   * at once (e.g., dayNight + workHours show overlapping translucent bands;
   * weekend recolors ticks/baseline on weekend-day columns regardless of band
   * state).
   */
  overlay: {
    dayNight: boolean;
    workHours: boolean;
    weekend: boolean;
  };

  workingHours: WorkingHours;
}

/**
 * Outcome of an `addZone` call. `duplicate` = the same entity (kind+slug) is
 * already present; `full` = the zone list is at MAX_ZONES. Both are no-ops the
 * caller should surface to the user instead of failing silently.
 */
export type AddZoneResult = 'added' | 'duplicate' | 'full';

export interface ConverterActions {
  addZone: (ref: ZoneRef) => AddZoneResult;
  removeZone: (index: number) => void;
  moveZone: (from: number, to: number) => void;
  setZones: (zones: ZoneRef[]) => void;
  setHomeZoneIndex: (index: number | null) => void;

  setAnchorDate: (date: string) => void;
  /**
   * Set both range endpoints in one update. `start` and `end` may be passed
   * in any order; the action normalizes so `rangeStart` is the leftmost
   * column.
   */
  setRange: (start: number, end: number) => void;
  setPreviewHour: (hour: number | null) => void;
  /** Clear the range and resync the date to today — used by the range pill's ×. */
  clearRange: () => void;
  /**
   * Reset everything user-tweakable EXCEPT the zone list itself: range, date,
   * overlays, working hours, format. Used by the toolbar reset button.
   */
  resetAll: () => void;

  setFormat: (format: TimeFormat) => void;
  toggleDayNightOverlay: () => void;
  toggleWorkHoursOverlay: () => void;
  toggleWeekendOverlay: () => void;
  setWorkingHours: (wh: WorkingHours) => void;

  initialize: (state: Partial<ConverterState>) => void;
}

const MAX_ZONES = 10;

/**
 * Today in the given IANA zone as YYYY-MM-DD. Falls back to browser-local
 * today when no zone is provided (strictly better than UTC as a default —
 * for a US-evening user, UTC is already tomorrow and the strip + NOW
 * indicator end up on the wrong day).
 */
export function todayInZone(iana?: string): string {
  const dt = iana ? DateTime.now().setZone(iana) : DateTime.now();
  return dt.toISODate() ?? new Date().toISOString().slice(0, 10);
}

/**
 * Heuristic: was `date` auto-set as "today" (either browser-local or UTC),
 * or did the user pick it? Used to decide whether re-deriving anchorDate
 * during a zone change is safe (don't clobber a user-chosen date).
 */
function isTodayDefault(date: string): boolean {
  return date === todayInZone() || date === new Date().toISOString().slice(0, 10);
}

function resolveHomeIana(zones: ZoneRef[], homeZoneIndex: number | null): string | undefined {
  if (homeZoneIndex !== null && zones[homeZoneIndex]) return zones[homeZoneIndex].iana;
  return zones[0]?.iana;
}

/**
 * When the de-facto home zone (zones[0]) changes via reorder/remove, the
 * existing `anchorDate` may be "today" in the OLD home zone but a different
 * calendar day in the NEW home zone — which causes HourStrip's now-guide to
 * disappear (it gates on `now-in-home.toISODate() === anchorDate`).
 *
 * If the user was on auto-today (anchorDate matches the snapshot), re-derive
 * both anchorDate and defaultAnchorDate for the new home. If they'd manually
 * picked a date via the DatePicker, leave it alone — they meant that date.
 */
function rederiveAnchorOnHomeChange(
  state: ConverterState,
  nextZones: ZoneRef[],
  patch: Partial<ConverterState>,
): void {
  const oldHomeIana = state.zones[0]?.iana;
  const newHomeIana = nextZones[0]?.iana;
  if (!newHomeIana || newHomeIana === oldHomeIana) return;
  if (state.anchorDate !== state.defaultAnchorDate) return;
  const homeToday = todayInZone(newHomeIana);
  patch.anchorDate = homeToday;
  patch.defaultAnchorDate = homeToday;
}

function buildDefaults(): ConverterState {
  const initialToday = todayInZone();
  return {
    zones: [],
    homeZoneIndex: null,
    anchorDate: initialToday,
    defaultAnchorDate: initialToday,
    rangeStart: null,
    rangeEnd: null,
    previewHour: null,
    format: '12',
    overlay: {
      dayNight: true,
      workHours: false,
      weekend: false,
    },
    workingHours: DEFAULT_WORKING_HOURS,
  };
}

/**
 * Build the initial slice for a fresh store: defaults merged with the caller's
 * partial, with the same derivations `initialize` applies (homeZoneIndex
 * defaulted to 0 when zones supplied without an explicit index; anchorDate
 * aligned to the home zone's local today when not explicitly pinned).
 *
 * Kept separate from `initialize` so a per-mount store can pre-populate state
 * at `createStore` time — which makes `getInitialState()` (the SSR snapshot
 * source for zustand@5's React adapter) return the *correct* populated state,
 * not the empty defaults. This is what fixes the SSR EmptyState flash.
 */
function buildInitialSlice(partial: Partial<ConverterState>): ConverterState {
  const defaults = buildDefaults();
  const merged: ConverterState = { ...defaults, ...partial };
  if (partial.zones !== undefined && partial.homeZoneIndex === undefined) {
    merged.homeZoneIndex = merged.zones.length > 0 ? 0 : null;
  }
  if (partial.anchorDate === undefined) {
    const homeIana = resolveHomeIana(merged.zones, merged.homeZoneIndex);
    if (homeIana && isTodayDefault(merged.anchorDate)) {
      const homeToday = todayInZone(homeIana);
      merged.anchorDate = homeToday;
      merged.defaultAnchorDate = homeToday;
    }
  } else {
    const homeIana = resolveHomeIana(merged.zones, merged.homeZoneIndex);
    merged.defaultAnchorDate = todayInZone(homeIana);
  }
  return merged;
}

export function createConverterStore(initialPartial: Partial<ConverterState> = {}) {
  const seed = buildInitialSlice(initialPartial);
  return createStore<ConverterState & ConverterActions>()(
    subscribeWithSelector((set) => ({
      ...seed,

      addZone: (ref) => {
        let result: AddZoneResult = 'added';
        set((state) => {
          // Identity is the entity (kind+slug), NOT the IANA: two distinct
          // entities can share an IANA (e.g. the GMT zone and the London city
          // are both Europe/London) and should coexist as separate rows. Only
          // re-adding the exact same entity is a duplicate.
          if (state.zones.some((z) => z.kind === ref.kind && z.slug === ref.slug)) {
            result = 'duplicate';
            return state;
          }
          if (state.zones.length >= MAX_ZONES) {
            result = 'full';
            return state;
          }
          const next: Partial<ConverterState> = { zones: [...state.zones, ref] };
          // First zone becomes the home: pin homeZoneIndex to 0 so the field
          // stays consistent with the other bootstrap paths (initialize,
          // setZones), and align anchorDate to its local today so the NOW
          // indicator renders on the right day.
          if (state.zones.length === 0) {
            next.homeZoneIndex = 0;
            if (isTodayDefault(state.anchorDate)) {
              const homeToday = todayInZone(ref.iana);
              next.anchorDate = homeToday;
              next.defaultAnchorDate = homeToday;
            }
          }
          return next;
        });
        return result;
      },

      removeZone: (index) =>
        set((state) => {
          const zones = state.zones.filter((_, i) => i !== index);
          let homeZoneIndex = state.homeZoneIndex;
          if (homeZoneIndex !== null) {
            if (homeZoneIndex === index) homeZoneIndex = null;
            else if (homeZoneIndex > index) homeZoneIndex -= 1;
          }
          const patch: Partial<ConverterState> = { zones, homeZoneIndex };
          rederiveAnchorOnHomeChange(state, zones, patch);
          return patch;
        }),

      moveZone: (from, to) =>
        set((state) => {
          if (from === to) return state;
          if (from < 0 || from >= state.zones.length) return state;
          if (to < 0 || to >= state.zones.length) return state;
          const zones = [...state.zones];
          const [moved] = zones.splice(from, 1);
          if (!moved) return state;
          zones.splice(to, 0, moved);

          let homeZoneIndex = state.homeZoneIndex;
          if (homeZoneIndex !== null) {
            if (homeZoneIndex === from) homeZoneIndex = to;
            else if (from < homeZoneIndex && to >= homeZoneIndex) homeZoneIndex -= 1;
            else if (from > homeZoneIndex && to <= homeZoneIndex) homeZoneIndex += 1;
          }
          const patch: Partial<ConverterState> = { zones, homeZoneIndex };
          rederiveAnchorOnHomeChange(state, zones, patch);
          return patch;
        }),

      setZones: (zones) =>
        set((state) => {
          const next = zones.slice(0, MAX_ZONES);
          const homeZoneIndex =
            state.homeZoneIndex !== null && state.homeZoneIndex < next.length
              ? state.homeZoneIndex
              : next.length > 0
                ? 0
                : null;
          const homeIana = resolveHomeIana(next, homeZoneIndex);
          const patch: Partial<ConverterState> = { zones: next, homeZoneIndex };
          if (homeIana && isTodayDefault(state.anchorDate)) {
            const homeToday = todayInZone(homeIana);
            patch.anchorDate = homeToday;
            patch.defaultAnchorDate = homeToday;
          }
          return patch;
        }),

      setHomeZoneIndex: (index) => set({ homeZoneIndex: index }),

      setAnchorDate: (date) => set({ anchorDate: date }),
      setRange: (start, end) => {
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        set({ rangeStart: lo, rangeEnd: hi });
      },
      setPreviewHour: (hour) => set({ previewHour: hour }),

      clearRange: () =>
        set((state) => {
          const homeToday = todayInZone(resolveHomeIana(state.zones, state.homeZoneIndex));
          return {
            rangeStart: null,
            rangeEnd: null,
            previewHour: null,
            anchorDate: homeToday,
            defaultAnchorDate: homeToday,
          };
        }),

      resetAll: () =>
        set((state) => {
          const homeToday = todayInZone(resolveHomeIana(state.zones, state.homeZoneIndex));
          const defaults = buildDefaults();
          return {
            rangeStart: null,
            rangeEnd: null,
            previewHour: null,
            anchorDate: homeToday,
            defaultAnchorDate: homeToday,
            format: defaults.format,
            overlay: { ...defaults.overlay },
            workingHours: DEFAULT_WORKING_HOURS,
          };
        }),

      setFormat: (format) => set({ format }),

      toggleDayNightOverlay: () =>
        set((state) => ({ overlay: { ...state.overlay, dayNight: !state.overlay.dayNight } })),

      toggleWorkHoursOverlay: () =>
        set((state) => ({ overlay: { ...state.overlay, workHours: !state.overlay.workHours } })),

      toggleWeekendOverlay: () =>
        set((state) => ({ overlay: { ...state.overlay, weekend: !state.overlay.weekend } })),

      setWorkingHours: (wh) => set({ workingHours: wh }),

      // Reset to defaults and re-apply `partial`. Used by ConverterStateProvider
      // to layer localStorage prefs on top of a per-mount store after hydration,
      // and (in tests) to reset a store between cases.
      initialize: (partial) => set(() => buildInitialSlice(partial)),
    })),
  );
}

export type ConverterStoreApi = ReturnType<typeof createConverterStore>;
