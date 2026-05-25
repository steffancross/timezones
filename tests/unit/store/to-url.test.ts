import { describe, expect, it } from 'vitest';
import { stateToQueryString } from '@/lib/store/to-url';

const TODAY = '2026-05-20';

describe('stateToQueryString', () => {
  it('returns empty string when everything is default', () => {
    expect(
      stateToQueryString({
        anchorDate: TODAY,
        defaultAnchorDate: TODAY,
        rangeStart: null,
        rangeEnd: null,
        format: '12',
      }),
    ).toBe('');
  });

  it('serializes a single-tile range as r=N', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStart: 15,
      rangeEnd: 15,
      format: '12',
    });
    expect(qs).toBe('r=15');
  });

  it('serializes a multi-tile range as r=N-M', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStart: 9,
      rangeEnd: 11,
      format: '12',
    });
    expect(qs).toBe('r=9-11');
  });

  it('includes rangeStart=0 (not treated as falsy default)', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStart: 0,
      rangeEnd: 0,
      format: '12',
    });
    expect(qs).toBe('r=0');
  });

  it('treats a null rangeEnd as a single-tile range at rangeStart', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStart: 15,
      rangeEnd: null,
      format: '12',
    });
    expect(qs).toBe('r=15');
  });

  it('omits date when it equals the snapshot default', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStart: 15,
      rangeEnd: 15,
      format: '12',
    });
    expect(qs).not.toContain('d=');
  });

  it('includes date when it differs from the snapshot default', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      defaultAnchorDate: TODAY,
      rangeStart: null,
      rangeEnd: null,
      format: '12',
    });
    expect(qs).toBe('d=2026-12-25');
  });

  it('omits format when default (12)', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStart: null,
      rangeEnd: null,
      format: '12',
    });
    expect(qs).not.toContain('f=');
  });

  it('includes format when 24', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      rangeStart: null,
      rangeEnd: null,
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
      rangeStart: null,
      rangeEnd: null,
      format: '12',
    });
    expect(qs).not.toContain('d=');
  });

  it('combines all set fields', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      defaultAnchorDate: TODAY,
      rangeStart: 9,
      rangeEnd: 11,
      format: '24',
    });
    const params = new URLSearchParams(qs);
    expect(params.get('d')).toBe('2026-12-25');
    expect(params.get('r')).toBe('9-11');
    expect(params.get('f')).toBe('24');
  });
});
