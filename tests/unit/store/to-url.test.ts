import { describe, expect, it } from 'vitest';
import { stateToQueryString } from '@/lib/store/to-url';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('stateToQueryString', () => {
  it('returns empty string when everything is default', () => {
    expect(stateToQueryString({ anchorDate: today(), anchorHour: null, format: '12' })).toBe('');
  });

  it('includes hour when set', () => {
    const qs = stateToQueryString({ anchorDate: today(), anchorHour: 15, format: '12' });
    expect(qs).toBe('h=15');
  });

  it('includes hour=0 (not treated as falsy default)', () => {
    const qs = stateToQueryString({ anchorDate: today(), anchorHour: 0, format: '12' });
    expect(qs).toBe('h=0');
  });

  it('omits date when it equals today', () => {
    const qs = stateToQueryString({ anchorDate: today(), anchorHour: 15, format: '12' });
    expect(qs).not.toContain('d=');
  });

  it('includes date when it differs from today', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      anchorHour: null,
      format: '12',
    });
    expect(qs).toBe('d=2026-12-25');
  });

  it('omits format when default (12)', () => {
    const qs = stateToQueryString({ anchorDate: today(), anchorHour: null, format: '12' });
    expect(qs).not.toContain('f=');
  });

  it('includes format when 24', () => {
    const qs = stateToQueryString({ anchorDate: today(), anchorHour: null, format: '24' });
    expect(qs).toBe('f=24');
  });

  it('combines all set fields', () => {
    const qs = stateToQueryString({
      anchorDate: '2026-12-25',
      anchorHour: 15,
      format: '24',
    });
    const params = new URLSearchParams(qs);
    expect(params.get('d')).toBe('2026-12-25');
    expect(params.get('h')).toBe('15');
    expect(params.get('f')).toBe('24');
  });
});
