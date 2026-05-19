import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TimeFormat } from '@/lib/time/format';
import { DEFAULT_WORKING_HOURS, type WorkingHours } from '@/lib/time/working-hours';

export interface ZoneRef {
  kind: 'zone' | 'city';
  slug: string;
  iana: string;
}

export type OverlayBand = 'dayNight' | 'workHours' | 'none';

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
  anchorHour: number | null;
  previewHour: number | null;

  format: TimeFormat;

  overlay: {
    band: OverlayBand;
    weekend: boolean;
  };

  workingHours: WorkingHours;
}

export interface ConverterActions {
  addZone: (ref: ZoneRef) => void;
  removeZone: (index: number) => void;
  moveZone: (from: number, to: number) => void;
  setZones: (zones: ZoneRef[]) => void;
  setHomeZoneIndex: (index: number | null) => void;

  setAnchorDate: (date: string) => void;
  setAnchorHour: (hour: number | null) => void;
  setPreviewHour: (hour: number | null) => void;
  /** Reset just the anchor (hour, date, preview) — keeps zones/format/overlays. */
  resetAnchor: () => void;

  setFormat: (format: TimeFormat) => void;
  setOverlayBand: (band: OverlayBand) => void;
  toggleWeekendOverlay: () => void;
  setWorkingHours: (wh: WorkingHours) => void;

  initialize: (state: Partial<ConverterState>) => void;
}

const MAX_ZONES = 10;

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialState: ConverterState = {
  zones: [],
  homeZoneIndex: null,
  anchorDate: todayISODate(),
  anchorHour: null,
  previewHour: null,
  format: '12',
  overlay: {
    band: 'dayNight',
    weekend: false,
  },
  workingHours: DEFAULT_WORKING_HOURS,
};

export const useConverterStore = create<ConverterState & ConverterActions>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    addZone: (ref) =>
      set((state) => {
        if (state.zones.some((z) => z.iana === ref.iana)) return state;
        if (state.zones.length >= MAX_ZONES) return state;
        return { zones: [...state.zones, ref] };
      }),

    removeZone: (index) =>
      set((state) => {
        const zones = state.zones.filter((_, i) => i !== index);
        let homeZoneIndex = state.homeZoneIndex;
        if (homeZoneIndex !== null) {
          if (homeZoneIndex === index) homeZoneIndex = null;
          else if (homeZoneIndex > index) homeZoneIndex -= 1;
        }
        return { zones, homeZoneIndex };
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
        return { zones, homeZoneIndex };
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
        return { zones: next, homeZoneIndex };
      }),

    setHomeZoneIndex: (index) => set({ homeZoneIndex: index }),

    setAnchorDate: (date) => set({ anchorDate: date }),
    setAnchorHour: (hour) => set({ anchorHour: hour }),
    setPreviewHour: (hour) => set({ previewHour: hour }),

    resetAnchor: () =>
      set({
        anchorHour: null,
        previewHour: null,
        anchorDate: todayISODate(),
      }),

    setFormat: (format) => set({ format }),

    setOverlayBand: (band) => set((state) => ({ overlay: { ...state.overlay, band } })),

    toggleWeekendOverlay: () =>
      set((state) => ({ overlay: { ...state.overlay, weekend: !state.overlay.weekend } })),

    setWorkingHours: (wh) => set({ workingHours: wh }),

    initialize: (partial) =>
      set((state) => {
        const merged = { ...state, ...partial };
        if (partial.zones !== undefined && partial.homeZoneIndex === undefined) {
          merged.homeZoneIndex = merged.zones.length > 0 ? 0 : null;
        }
        return merged;
      }),
  })),
);
