import { beforeEach, describe, expect, it } from 'vitest';
import { createConverterStore, type ZoneRef } from '@/lib/store/converter';

const pst: ZoneRef = { kind: 'zone', slug: 'pst', iana: 'America/Los_Angeles' };
const est: ZoneRef = { kind: 'zone', slug: 'est', iana: 'America/New_York' };
const tokyo: ZoneRef = { kind: 'city', slug: 'tokyo', iana: 'Asia/Tokyo' };
const london: ZoneRef = { kind: 'zone', slug: 'gmt', iana: 'Europe/London' };

// Fresh store per test. Pre-refactor this was a singleton reset via
// `useConverterStore.setState({...})` in beforeEach; the per-mount factory
// gives us full isolation for free.
let store: ReturnType<typeof createConverterStore>;
function freshStore() {
  store = createConverterStore();
}

describe('addZone', () => {
  beforeEach(freshStore);

  it('adds a zone', () => {
    store.getState().addZone(pst);
    expect(store.getState().zones).toHaveLength(1);
  });

  it('dedupes by IANA', () => {
    const { addZone } = store.getState();
    addZone(pst);
    addZone({ ...pst, slug: 'pacific-time' });
    expect(store.getState().zones).toHaveLength(1);
  });

  it('blocks past MAX_ZONES (10)', () => {
    const { addZone } = store.getState();
    for (let i = 0; i < 12; i++) {
      addZone({ kind: 'zone', slug: `z${i}`, iana: `Etc/GMT-${i}` });
    }
    expect(store.getState().zones).toHaveLength(10);
  });
});

describe('removeZone', () => {
  beforeEach(freshStore);

  it('removes by index', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.removeZone(0);
    expect(store.getState().zones).toEqual([est]);
  });

  it('clears homeZoneIndex when removing home', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.setHomeZoneIndex(1);
    s.removeZone(1);
    expect(store.getState().homeZoneIndex).toBeNull();
  });

  it('decrements homeZoneIndex when removing before it', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(2);
    s.removeZone(0);
    expect(store.getState().homeZoneIndex).toBe(1);
  });

  it('leaves homeZoneIndex alone when removing after it', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(0);
    s.removeZone(2);
    expect(store.getState().homeZoneIndex).toBe(0);
  });
});

describe('moveZone', () => {
  beforeEach(freshStore);

  it('reorders zones', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.moveZone(0, 2);
    expect(store.getState().zones.map((z) => z.iana)).toEqual([
      'America/New_York',
      'Asia/Tokyo',
      'America/Los_Angeles',
    ]);
  });

  it('tracks home through the move when home is moved', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(0);
    s.moveZone(0, 2);
    expect(store.getState().homeZoneIndex).toBe(2);
  });

  it('shifts home left when an earlier zone moves past it', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.addZone(london);
    s.setHomeZoneIndex(2);
    s.moveZone(0, 3);
    expect(store.getState().homeZoneIndex).toBe(1);
  });

  it('shifts home right when a later zone moves before it', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.addZone(london);
    s.setHomeZoneIndex(2);
    s.moveZone(3, 1);
    expect(store.getState().homeZoneIndex).toBe(3);
  });
});

describe('setZones', () => {
  beforeEach(freshStore);

  it('clamps homeZoneIndex when new array is shorter', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(2);
    s.setZones([pst, est]);
    expect(store.getState().homeZoneIndex).toBe(0);
  });

  it('sets homeZoneIndex to null when new array is empty', () => {
    const s = store.getState();
    s.addZone(pst);
    s.setHomeZoneIndex(0);
    s.setZones([]);
    expect(store.getState().homeZoneIndex).toBeNull();
  });

  it('truncates to MAX_ZONES', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      kind: 'zone' as const,
      slug: `z${i}`,
      iana: `Etc/GMT-${i}`,
    }));
    store.getState().setZones(many);
    expect(store.getState().zones).toHaveLength(10);
  });
});

describe('initialize', () => {
  beforeEach(freshStore);

  it('sets homeZoneIndex to 0 when zones provided without explicit index', () => {
    store.getState().initialize({ zones: [pst, est] });
    expect(store.getState().homeZoneIndex).toBe(0);
  });

  it('respects explicit homeZoneIndex', () => {
    store.getState().initialize({ zones: [pst, est], homeZoneIndex: 1 });
    expect(store.getState().homeZoneIndex).toBe(1);
  });

  it('sets homeZoneIndex to null when zones is empty array', () => {
    store.getState().initialize({ zones: [] });
    expect(store.getState().homeZoneIndex).toBeNull();
  });
});

describe('clearRange', () => {
  beforeEach(freshStore);

  it('clears anchor hour, preview hour, and resets anchor date', () => {
    const s = store.getState();
    s.addZone(pst);
    s.setRange(15, 15);
    s.setPreviewHour(10);
    s.setAnchorDate('2026-01-01');
    s.clearRange();
    const next = store.getState();
    expect(next.rangeStart).toBeNull();
    expect(next.previewHour).toBeNull();
    expect(next.anchorDate).not.toBe('2026-01-01');
  });

  it('keeps zones, format, overlay, workingHours intact', () => {
    const s = store.getState();
    s.addZone(pst);
    s.setFormat('24');
    s.toggleWeekendOverlay();
    s.clearRange();
    const next = store.getState();
    expect(next.zones).toHaveLength(1);
    expect(next.format).toBe('24');
    expect(next.overlay.weekend).toBe(true);
  });
});

describe('resetAll', () => {
  beforeEach(freshStore);

  it('resets anchor + format + overlays + workingHours but keeps zones', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.setRange(15, 15);
    s.setAnchorDate('2026-01-01');
    s.setFormat('24');
    s.toggleWorkHoursOverlay();
    s.toggleWeekendOverlay();
    s.setWorkingHours({ start: 8, end: 18, days: [1, 2, 3, 4, 5, 6] });
    s.resetAll();
    const next = store.getState();
    expect(next.zones).toHaveLength(2);
    expect(next.rangeStart).toBeNull();
    expect(next.previewHour).toBeNull();
    expect(next.anchorDate).not.toBe('2026-01-01');
    expect(next.format).toBe('12');
    expect(next.overlay).toEqual({ dayNight: true, workHours: false, weekend: false });
    expect(next.workingHours).toEqual({ start: 9, end: 17, days: [1, 2, 3, 4, 5] });
  });
});

describe('moveZone / removeZone re-derive anchorDate when zones[0] changes', () => {
  beforeEach(freshStore);

  it('moveZone updates anchorDate to today-in-new-home when home was on auto-today', () => {
    // Set up: PST + Tokyo. zones[0]=PST. anchorDate auto-derived to today-in-PST.
    const s = store.getState();
    s.addZone(pst);
    s.addZone(tokyo);
    const before = store.getState();
    expect(before.anchorDate).toBe(before.defaultAnchorDate);

    // Move PST to position 1 → Tokyo becomes zones[0] → de-facto home.
    s.moveZone(0, 1);
    const after = store.getState();
    expect(after.zones[0]?.iana).toBe('Asia/Tokyo');
    // anchorDate AND defaultAnchorDate should now reflect today-in-Tokyo so
    // the now-guide finds the right column instead of vanishing when LA and
    // Tokyo straddle a calendar boundary.
    expect(after.anchorDate).toBe(after.defaultAnchorDate);
  });

  it('moveZone does NOT clobber a user-picked anchorDate', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(tokyo);
    s.setAnchorDate('2026-12-25');
    s.moveZone(0, 1);
    expect(store.getState().anchorDate).toBe('2026-12-25');
  });

  it('removeZone re-derives anchorDate when removing zones[0] changes the home', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(tokyo);
    const before = store.getState();
    expect(before.anchorDate).toBe(before.defaultAnchorDate);

    s.removeZone(0); // PST gone, Tokyo becomes zones[0]
    const after = store.getState();
    expect(after.zones[0]?.iana).toBe('Asia/Tokyo');
    expect(after.anchorDate).toBe(after.defaultAnchorDate);
  });

  it('moveZone is a no-op for anchorDate when home zone position is unchanged', () => {
    const s = store.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    const before = store.getState().anchorDate;

    s.moveZone(1, 2); // swap est & tokyo, PST still at 0
    expect(store.getState().zones[0]?.iana).toBe('America/Los_Angeles');
    expect(store.getState().anchorDate).toBe(before);
  });
});

describe('defaultAnchorDate snapshot', () => {
  beforeEach(freshStore);

  it('matches anchorDate immediately after the first zone is added', () => {
    store.getState().addZone(pst);
    const { anchorDate, defaultAnchorDate } = store.getState();
    expect(anchorDate).toBe(defaultAnchorDate);
  });

  it('stays put when the user picks a non-default date via setAnchorDate', () => {
    const s = store.getState();
    s.addZone(pst);
    const snapshot = store.getState().defaultAnchorDate;
    s.setAnchorDate('2026-12-25');
    const next = store.getState();
    expect(next.anchorDate).toBe('2026-12-25');
    expect(next.defaultAnchorDate).toBe(snapshot);
  });

  it('resyncs to anchorDate on resetAll', () => {
    const s = store.getState();
    s.addZone(pst);
    s.setAnchorDate('2026-12-25');
    s.resetAll();
    const next = store.getState();
    expect(next.anchorDate).toBe(next.defaultAnchorDate);
  });

  it('resyncs to anchorDate on clearRange', () => {
    const s = store.getState();
    s.addZone(pst);
    s.setAnchorDate('2026-12-25');
    s.clearRange();
    const next = store.getState();
    expect(next.anchorDate).toBe(next.defaultAnchorDate);
  });

  it('updates when initialize re-derives the date for a new home zone', () => {
    store.getState().initialize({ zones: [tokyo] });
    const { anchorDate, defaultAnchorDate } = store.getState();
    expect(anchorDate).toBe(defaultAnchorDate);
  });

  it('still reflects the home-zone today when initialize is called with an explicit anchorDate', () => {
    // URL ?d=... case: caller pins the date but ResetButton still needs to
    // know what "default" would have been so it can tell the URL date apart.
    store.getState().initialize({ zones: [tokyo], anchorDate: '2026-12-25' });
    const next = store.getState();
    expect(next.anchorDate).toBe('2026-12-25');
    expect(next.defaultAnchorDate).not.toBe('2026-12-25');
  });
});
