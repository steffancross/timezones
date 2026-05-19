import { beforeEach, describe, expect, it } from 'vitest';
import { useConverterStore, type ZoneRef } from '@/lib/store/converter';

const pst: ZoneRef = { kind: 'zone', slug: 'pst', iana: 'America/Los_Angeles' };
const est: ZoneRef = { kind: 'zone', slug: 'est', iana: 'America/New_York' };
const tokyo: ZoneRef = { kind: 'city', slug: 'tokyo', iana: 'Asia/Tokyo' };
const london: ZoneRef = { kind: 'zone', slug: 'gmt', iana: 'Europe/London' };

function resetStore() {
  useConverterStore.setState({
    zones: [],
    homeZoneIndex: null,
    anchorHour: null,
    previewHour: null,
  });
}

describe('addZone', () => {
  beforeEach(resetStore);

  it('adds a zone', () => {
    useConverterStore.getState().addZone(pst);
    expect(useConverterStore.getState().zones).toHaveLength(1);
  });

  it('dedupes by IANA', () => {
    const { addZone } = useConverterStore.getState();
    addZone(pst);
    addZone({ ...pst, slug: 'pacific-time' });
    expect(useConverterStore.getState().zones).toHaveLength(1);
  });

  it('blocks past MAX_ZONES (10)', () => {
    const { addZone } = useConverterStore.getState();
    for (let i = 0; i < 12; i++) {
      addZone({ kind: 'zone', slug: `z${i}`, iana: `Etc/GMT-${i}` });
    }
    expect(useConverterStore.getState().zones).toHaveLength(10);
  });
});

describe('removeZone', () => {
  beforeEach(resetStore);

  it('removes by index', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.removeZone(0);
    expect(useConverterStore.getState().zones).toEqual([est]);
  });

  it('clears homeZoneIndex when removing home', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.setHomeZoneIndex(1);
    s.removeZone(1);
    expect(useConverterStore.getState().homeZoneIndex).toBeNull();
  });

  it('decrements homeZoneIndex when removing before it', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(2);
    s.removeZone(0);
    expect(useConverterStore.getState().homeZoneIndex).toBe(1);
  });

  it('leaves homeZoneIndex alone when removing after it', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(0);
    s.removeZone(2);
    expect(useConverterStore.getState().homeZoneIndex).toBe(0);
  });
});

describe('moveZone', () => {
  beforeEach(resetStore);

  it('reorders zones', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.moveZone(0, 2);
    expect(useConverterStore.getState().zones.map((z) => z.iana)).toEqual([
      'America/New_York',
      'Asia/Tokyo',
      'America/Los_Angeles',
    ]);
  });

  it('tracks home through the move when home is moved', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(0);
    s.moveZone(0, 2);
    expect(useConverterStore.getState().homeZoneIndex).toBe(2);
  });

  it('shifts home left when an earlier zone moves past it', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.addZone(london);
    s.setHomeZoneIndex(2);
    s.moveZone(0, 3);
    expect(useConverterStore.getState().homeZoneIndex).toBe(1);
  });

  it('shifts home right when a later zone moves before it', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.addZone(london);
    s.setHomeZoneIndex(2);
    s.moveZone(3, 1);
    expect(useConverterStore.getState().homeZoneIndex).toBe(3);
  });
});

describe('setZones', () => {
  beforeEach(resetStore);

  it('clamps homeZoneIndex when new array is shorter', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.addZone(est);
    s.addZone(tokyo);
    s.setHomeZoneIndex(2);
    s.setZones([pst, est]);
    expect(useConverterStore.getState().homeZoneIndex).toBe(0);
  });

  it('sets homeZoneIndex to null when new array is empty', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.setHomeZoneIndex(0);
    s.setZones([]);
    expect(useConverterStore.getState().homeZoneIndex).toBeNull();
  });

  it('truncates to MAX_ZONES', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      kind: 'zone' as const,
      slug: `z${i}`,
      iana: `Etc/GMT-${i}`,
    }));
    useConverterStore.getState().setZones(many);
    expect(useConverterStore.getState().zones).toHaveLength(10);
  });
});

describe('initialize', () => {
  beforeEach(resetStore);

  it('sets homeZoneIndex to 0 when zones provided without explicit index', () => {
    useConverterStore.getState().initialize({ zones: [pst, est] });
    expect(useConverterStore.getState().homeZoneIndex).toBe(0);
  });

  it('respects explicit homeZoneIndex', () => {
    useConverterStore.getState().initialize({ zones: [pst, est], homeZoneIndex: 1 });
    expect(useConverterStore.getState().homeZoneIndex).toBe(1);
  });

  it('sets homeZoneIndex to null when zones is empty array', () => {
    useConverterStore.getState().initialize({ zones: [] });
    expect(useConverterStore.getState().homeZoneIndex).toBeNull();
  });
});

describe('resetAnchor', () => {
  beforeEach(resetStore);

  it('clears anchor hour, preview hour, and resets anchor date', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.setAnchorHour(15);
    s.setPreviewHour(10);
    s.setAnchorDate('2026-01-01');
    s.resetAnchor();
    const next = useConverterStore.getState();
    expect(next.anchorHour).toBeNull();
    expect(next.previewHour).toBeNull();
    expect(next.anchorDate).not.toBe('2026-01-01');
  });

  it('keeps zones, format, overlay, workingHours intact', () => {
    const s = useConverterStore.getState();
    s.addZone(pst);
    s.setFormat('24');
    s.toggleWeekendOverlay();
    s.resetAnchor();
    const next = useConverterStore.getState();
    expect(next.zones).toHaveLength(1);
    expect(next.format).toBe('24');
    expect(next.overlay.weekend).toBe(true);
  });
});
