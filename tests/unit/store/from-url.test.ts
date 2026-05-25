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

  it('accepts valid rangeStart and mirrors it as rangeEnd when not provided', () => {
    const r = urlToState({ pair: pstToEst, rangeStart: 15 });
    expect(r.rangeStart).toBe(15);
    expect(r.rangeEnd).toBe(15);
  });

  it('accepts a multi-tile rangeStart..rangeEnd', () => {
    const r = urlToState({ pair: pstToEst, rangeStart: 9, rangeEnd: 11 });
    expect(r.rangeStart).toBe(9);
    expect(r.rangeEnd).toBe(11);
  });

  it('clamps a rangeEnd less than rangeStart back to rangeStart', () => {
    // Defensive: keeps a malformed URL from producing a swapped/inverted range
    // — the parser already normalizes start <= end via min/max in the store.
    const r = urlToState({ pair: pstToEst, rangeStart: 10, rangeEnd: 5 });
    expect(r.rangeStart).toBe(10);
    expect(r.rangeEnd).toBe(10);
  });

  it('rejects out-of-range rangeStart', () => {
    expect(urlToState({ pair: pstToEst, rangeStart: 99 }).rangeStart).toBeUndefined();
    expect(urlToState({ pair: pstToEst, rangeStart: -1 }).rangeStart).toBeUndefined();
    expect(urlToState({ pair: pstToEst, rangeStart: 24 }).rangeStart).toBeUndefined();
  });

  it('accepts valid format', () => {
    expect(urlToState({ pair: pstToEst, format: '24' }).format).toBe('24');
    expect(urlToState({ pair: pstToEst, format: '12' }).format).toBe('12');
  });

  it('omits unset fields entirely', () => {
    const r = urlToState({});
    expect(r.zones).toBeUndefined();
    expect(r.anchorDate).toBeUndefined();
    expect(r.rangeStart).toBeUndefined();
    expect(r.rangeEnd).toBeUndefined();
    expect(r.format).toBeUndefined();
  });
});

describe('parseSearchParams', () => {
  it('parses d/r/f with a single-tile range', () => {
    expect(parseSearchParams({ d: '2026-05-14', r: '15', f: '24' })).toEqual({
      date: '2026-05-14',
      rangeStart: 15,
      rangeEnd: 15,
      format: '24',
      zones: undefined,
    });
  });

  it('parses r=N-M as an inclusive range', () => {
    const r = parseSearchParams({ r: '9-11' });
    expect(r.rangeStart).toBe(9);
    expect(r.rangeEnd).toBe(11);
  });

  it('takes the first value when a param is an array', () => {
    expect(parseSearchParams({ r: ['15', '16'] }).rangeStart).toBe(15);
  });

  it('returns undefined for unparseable range', () => {
    expect(parseSearchParams({ r: 'abc' }).rangeStart).toBeUndefined();
  });

  it('falls back to single-tile when only the start side parses', () => {
    const r = parseSearchParams({ r: '9-xyz' });
    expect(r.rangeStart).toBe(9);
    expect(r.rangeEnd).toBe(9);
  });

  it('returns undefined for unknown format', () => {
    expect(parseSearchParams({ f: '36' }).format).toBeUndefined();
  });

  it('returns all-undefined for empty input', () => {
    expect(parseSearchParams({})).toEqual({
      date: undefined,
      rangeStart: undefined,
      rangeEnd: undefined,
      format: undefined,
      zones: undefined,
    });
  });
});
