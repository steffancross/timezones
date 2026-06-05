import { describe, expect, it } from 'vitest';
import { stateToQueryString } from '@/lib/store/to-url';

const TODAY = '2026-05-20';

describe('stateToQueryString', () => {
  it('returns empty string when everything is default', () => {
    expect(
      stateToQueryString({
        anchorDate: TODAY,
        defaultAnchorDate: TODAY,
        rangeStartMin: null,
        rangeEndMin: null,
        format: '12',
      }),
    ).toBe('');
  });

  it('serializes a one-hour range as r=HHmm-HHmm', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: 900,
      rangeEndMin: 960,
      format: '12',
    });
    expect(qs).toBe('r=1500-1600');
  });

  it('serializes a wider range', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: 540,
      rangeEndMin: 720,
      format: '12',
    });
    expect(qs).toBe('r=0900-1200');
  });

  it('serializes a 15-minute-precise range', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: 180,
      rangeEndMin: 315,
      format: '12',
    });
    expect(qs).toBe('r=0300-0515');
  });

  it('serializes a midnight start (00:00) without treating it as a falsy default', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: 0,
      rangeEndMin: 60,
      format: '12',
    });
    expect(qs).toBe('r=0000-0100');
  });

  it('serializes a next-day-midnight end as the 2400 sentinel', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: 1380,
      rangeEndMin: 1440,
      format: '12',
    });
    expect(qs).toBe('r=2300-2400');
  });

  it('treats a null rangeEndMin as a one-hour block from the start', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: 900,
      rangeEndMin: null,
      format: '12',
    });
    expect(qs).toBe('r=1500-1600');
  });

  it('omits date when it equals the snapshot default', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: 900,
      rangeEndMin: 960,
      format: '12',
    });
    expect(qs).not.toContain('d=');
  });

  it('includes date when it differs from the snapshot default', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      defaultAnchorDate: TODAY,
      rangeStartMin: null,
      rangeEndMin: null,
      format: '12',
    });
    expect(qs).toBe('d=2026-12-25');
  });

  it('omits format when default (12)', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: null,
      rangeEndMin: null,
      format: '12',
    });
    expect(qs).not.toContain('f=');
  });

  it('includes format when 24', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStartMin: null,
      rangeEndMin: null,
      format: '24',
    });
    expect(qs).toBe('f=24');
  });

  it('uses the store snapshot for "default", not a live clock', () => {
    // The snapshot can be anything the store decided — e.g. tomorrow's date in
    // Asia/Tokyo while the test machine is on a PT clock. As long as anchorDate
    // matches the snapshot, `d=` is omitted.
    const qs = stateToQueryString({
      anchorDate: '2026-05-21',
      defaultAnchorDate: '2026-05-21',
      rangeStartMin: null,
      rangeEndMin: null,
      format: '12',
    });
    expect(qs).not.toContain('d=');
  });

  it('combines all set fields', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      defaultAnchorDate: TODAY,
      rangeStartMin: 540,
      rangeEndMin: 720,
      format: '24',
    });
    const params = new URLSearchParams(qs);
    expect(params.get('d')).toBe('2026-12-25');
    expect(params.get('r')).toBe('0900-1200');
    expect(params.get('f')).toBe('24');
  });
});
