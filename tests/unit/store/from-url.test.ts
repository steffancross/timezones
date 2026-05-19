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

  it('accepts valid hour', () => {
    expect(urlToState({ pair: pstToEst, hour: 15 }).anchorHour).toBe(15);
    expect(urlToState({ pair: pstToEst, hour: 0 }).anchorHour).toBe(0);
    expect(urlToState({ pair: pstToEst, hour: 23 }).anchorHour).toBe(23);
  });

  it('rejects out-of-range hour', () => {
    expect(urlToState({ pair: pstToEst, hour: 99 }).anchorHour).toBeUndefined();
    expect(urlToState({ pair: pstToEst, hour: -1 }).anchorHour).toBeUndefined();
    expect(urlToState({ pair: pstToEst, hour: 24 }).anchorHour).toBeUndefined();
  });

  it('accepts valid format', () => {
    expect(urlToState({ pair: pstToEst, format: '24' }).format).toBe('24');
    expect(urlToState({ pair: pstToEst, format: '12' }).format).toBe('12');
  });

  it('omits unset fields entirely', () => {
    const r = urlToState({});
    expect(r.zones).toBeUndefined();
    expect(r.anchorDate).toBeUndefined();
    expect(r.anchorHour).toBeUndefined();
    expect(r.format).toBeUndefined();
  });
});

describe('parseSearchParams', () => {
  it('parses d/h/f', () => {
    expect(parseSearchParams({ d: '2026-05-14', h: '15', f: '24' })).toEqual({
      date: '2026-05-14',
      hour: 15,
      format: '24',
    });
  });

  it('takes the first value when a param is an array', () => {
    expect(parseSearchParams({ h: ['15', '16'] }).hour).toBe(15);
  });

  it('returns undefined for unparseable hour', () => {
    expect(parseSearchParams({ h: 'abc' }).hour).toBeUndefined();
  });

  it('returns undefined for unknown format', () => {
    expect(parseSearchParams({ f: '36' }).format).toBeUndefined();
  });

  it('returns all-undefined for empty input', () => {
    expect(parseSearchParams({})).toEqual({
      date: undefined,
      hour: undefined,
      format: undefined,
    });
  });
});
