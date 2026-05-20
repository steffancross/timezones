import { describe, expect, it } from 'vitest';
import { stateToQueryString } from '@/lib/store/to-url';

const TODAY = '2026-05-20';

describe('stateToQueryString', () => {
  it('returns empty string when everything is default', () => {
    expect(
      stateToQueryString({
        anchorDate: TODAY,
        defaultAnchorDate: TODAY,
        anchorHour: null,
        format: '12',
      }),
    ).toBe('');
  });

  it('includes hour when set', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      anchorHour: 15,
      format: '12',
    });
    expect(qs).toBe('h=15');
  });

  it('includes hour=0 (not treated as falsy default)', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      anchorHour: 0,
      format: '12',
    });
    expect(qs).toBe('h=0');
  });

  it('omits date when it equals the snapshot default', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      anchorHour: 15,
      format: '12',
    });
    expect(qs).not.toContain('d=');
  });

  it('includes date when it differs from the snapshot default', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      defaultAnchorDate: TODAY,
      anchorHour: null,
      format: '12',
    });
    expect(qs).toBe('d=2026-12-25');
  });

  it('omits format when default (12)', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      anchorHour: null,
      format: '12',
    });
    expect(qs).not.toContain('f=');
  });

  it('includes format when 24', () => {
    const qs = stateToQueryString({
      anchorDate: TODAY,
      defaultAnchorDate: TODAY,
      anchorHour: null,
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
      anchorHour: null,
      format: '12',
    });
    expect(qs).not.toContain('d=');
  });

  it('combines all set fields', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      defaultAnchorDate: TODAY,
      anchorHour: 15,
      format: '24',
    });
    const params = new URLSearchParams(qs);
    expect(params.get('d')).toBe('2026-12-25');
    expect(params.get('h')).toBe('15');
    expect(params.get('f')).toBe('24');
  });
});
