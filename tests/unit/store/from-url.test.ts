import { describe, expect, it } from 'vitest';
import { parsePairSlug } from '@/lib/slugs/parse';
import { parseSearchParams, urlToState } from '@/lib/store/from-url';

const pstToEst = parsePairSlug('pst-to-est');
if (!pstToEst) throw new Error('test fixture: pst-to-est should parse');

describe('urlToState', () => {
  it('builds zones + homeZoneIndex from a pair', () => {
    const r = urlToState({ pair: pstToEst });
    expect(r.zones?.map((z) => z.iana)).toEqual(['America/Los_Angeles', 'America/New_York']);
    expect(r.homeZoneIndex).toBe(0);
  });

  it('accepts a valid date', () => {
    const r = urlToState({ pair: pstToEst, date: '2026-05-14' });
    expect(r.anchorDate).toBe('2026-05-14');
  });

  it('rejects invalid date string', () => {
    const r = urlToState({ pair: pstToEst, date: 'not-a-date' });
    expect(r.anchorDate).toBeUndefined();
  });

  it('rejects impossible date (Feb 30)', () => {
    const r = urlToState({ pair: pstToEst, date: '2026-02-30' });
    expect(r.anchorDate).toBeUndefined();
  });

  it('accepts a valid minute range', () => {
    const r = urlToState({ pair: pstToEst, rangeStartMin: 180, rangeEndMin: 315 });
    expect(r.rangeStartMin).toBe(180);
    expect(r.rangeEndMin).toBe(315);
  });

  it('rejects an inverted range (end <= start)', () => {
    const r = urlToState({ pair: pstToEst, rangeStartMin: 600, rangeEndMin: 300 });
    expect(r.rangeStartMin).toBeUndefined();
    expect(r.rangeEndMin).toBeUndefined();
  });

  it('rejects endpoints that are not multiples of 15', () => {
    const r = urlToState({ pair: pstToEst, rangeStartMin: 187, rangeEndMin: 315 });
    expect(r.rangeStartMin).toBeUndefined();
  });

  it('rejects out-of-range endpoints', () => {
    expect(
      urlToState({ pair: pstToEst, rangeStartMin: -15, rangeEndMin: 60 }).rangeStartMin,
    ).toBeUndefined();
    expect(
      urlToState({ pair: pstToEst, rangeStartMin: 1440, rangeEndMin: 1440 }).rangeStartMin,
    ).toBeUndefined();
    expect(
      urlToState({ pair: pstToEst, rangeStartMin: 1380, rangeEndMin: 1455 }).rangeStartMin,
    ).toBeUndefined();
  });

  it('requires a minimum 15-min span', () => {
    const r = urlToState({ pair: pstToEst, rangeStartMin: 180, rangeEndMin: 180 });
    expect(r.rangeStartMin).toBeUndefined();
  });

  it('accepts valid format', () => {
    expect(urlToState({ pair: pstToEst, format: '24' }).format).toBe('24');
    expect(urlToState({ pair: pstToEst, format: '12' }).format).toBe('12');
  });

  it('omits unset fields entirely', () => {
    const r = urlToState({});
    expect(r.zones).toBeUndefined();
    expect(r.anchorDate).toBeUndefined();
    expect(r.rangeStartMin).toBeUndefined();
    expect(r.rangeEndMin).toBeUndefined();
    expect(r.format).toBeUndefined();
  });
});

describe('parseSearchParams', () => {
  it('parses d/r/f with an HHmm-HHmm range', () => {
    expect(parseSearchParams({ d: '2026-05-14', r: '1500-1600', f: '24' })).toEqual({
      date: '2026-05-14',
      rangeStartMin: 900,
      rangeEndMin: 960,
      format: '24',
      zones: undefined,
    });
  });

  it('parses a 15-minute-precise range', () => {
    const r = parseSearchParams({ r: '0300-0515' });
    expect(r.rangeStartMin).toBe(180);
    expect(r.rangeEndMin).toBe(315);
  });

  it('parses the 2400 sentinel as next-day midnight', () => {
    const r = parseSearchParams({ r: '2300-2400' });
    expect(r.rangeStartMin).toBe(1380);
    expect(r.rangeEndMin).toBe(1440);
  });

  it('takes the first value when a param is an array', () => {
    expect(parseSearchParams({ r: ['1500-1600', '1600-1700'] }).rangeStartMin).toBe(900);
  });

  it.each([
    'abc',
    '1500',
    '15-16',
    '1500-',
    '1560-1600',
    '2401-2400',
  ])('returns undefined for malformed range %s', (raw) => {
    expect(parseSearchParams({ r: raw }).rangeStartMin).toBeUndefined();
  });

  it('returns undefined for unknown format', () => {
    expect(parseSearchParams({ f: '36' }).format).toBeUndefined();
  });

  it('returns all-undefined for empty input', () => {
    expect(parseSearchParams({})).toEqual({
      date: undefined,
      rangeStartMin: undefined,
      rangeEndMin: undefined,
      format: undefined,
      zones: undefined,
    });
  });
});
