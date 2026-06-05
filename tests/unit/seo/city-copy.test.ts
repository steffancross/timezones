import { describe, expect, it } from 'vitest';
import { getCityById } from '@/lib/cities/resolve';
import { buildCityDescription } from '@/lib/seo/city-copy';

function city(id: string) {
  const c = getCityById(id);
  if (!c) throw new Error(`unknown test city: ${id}`);
  return c;
}

describe('buildCityDescription', () => {
  // DST city: query-first, then zone name + std/daylight abbreviations + both offsets.
  it('DST city resolves zone facts and offsets (new-york)', () => {
    expect(buildCityDescription(city('new-york'))).toBe(
      'Current local time in New York, United States — Eastern Time (EST/EDT), UTC−5, or UTC−4 during daylight saving. Sunrise, sunset, and conversions.',
    );
  });

  // No-DST city: single offset + "no daylight saving", single abbreviation.
  it('no-DST city omits the daylight clause (mumbai → IST, UTC+5:30)', () => {
    const d = buildCityDescription(city('mumbai'));
    expect(d).toContain('Current local time in Mumbai, India');
    expect(d).toContain('UTC+5:30');
    expect(d).toContain('no daylight saving');
    expect(d).not.toMatch(/during daylight saving/);
  });

  it('no-DST city (tokyo → UTC+9)', () => {
    const d = buildCityDescription(city('tokyo'));
    expect(d).toContain('Current local time in Tokyo, Japan');
    expect(d).toContain('UTC+9');
    expect(d).toContain('no daylight saving');
  });

  it('DST city in the eastern hemisphere (london → UTC+0/+1)', () => {
    const d = buildCityDescription(city('london'));
    expect(d).toContain('Current local time in London, United Kingdom');
    expect(d).toContain('UTC±0');
    expect(d).toContain('during daylight saving');
  });

  it('never prints the raw IANA identifier', () => {
    for (const id of ['new-york', 'tokyo', 'london', 'mumbai']) {
      const c = city(id);
      expect(buildCityDescription(c)).not.toContain(c.iana);
      expect(buildCityDescription(c)).not.toContain('Time zone:');
    }
  });

  it.each(['new-york', 'tokyo', 'london', 'mumbai'])('within budget and query-first: %s', (id) => {
    const c = city(id);
    const d = buildCityDescription(c);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.startsWith(`Current local time in ${c.name}`)).toBe(true);
  });
});
