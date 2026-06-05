import { buildPairDescription, buildPairTitle } from '@/lib/seo/pair-copy';
import { parsePairSlug } from '@/lib/slugs/parse';
import { describe, expect, it } from 'vitest';

function pair(slug: string) {
  const p = parsePairSlug(slug);
  if (!p) throw new Error(`unparseable test slug: ${slug}`);
  return p;
}

describe('buildPairTitle', () => {
  it('zone↔zone: hybrid abbreviation + short-name form', () => {
    expect(buildPairTitle(pair('est-to-ist'))).toBe('EST to IST Converter — Eastern to India Time');
  });

  it('city-involved: simple name form, no hybrid tail', () => {
    // A city on either side has no abbreviation duality, so the "— X to Y Time"
    // tail is dropped in favour of plain labels.
    expect(buildPairTitle(pair('est-to-tokyo'))).toBe('EST to Tokyo Time Converter');
    expect(buildPairTitle(pair('new-york-to-london'))).toBe('New York to London Time Converter');
  });
});

describe('buildPairDescription', () => {
  // Branch A — exactly one side observes DST: lead with the evergreen standard
  // gap, then the daylight-season gap labelled by the observing side's abbrev.
  it('Branch A: one DST side (est→ist)', () => {
    expect(buildPairDescription(pair('est-to-ist'))).toBe(
      'IST is 10 hours 30 minutes ahead of EST, or 9.5 hours during EDT. India has no DST; Eastern observes daylight saving. Hour-by-hour table.',
    );
  });

  it('Branch A: reverse flips direction and lead zone (ist→est)', () => {
    expect(buildPairDescription(pair('ist-to-est'))).toBe(
      'EST is 10 hours 30 minutes behind IST, or 9.5 hours during EDT. India has no DST; Eastern observes daylight saving. Hour-by-hour table.',
    );
  });

  // Branch B — constant gap: no "during X" clause; a DST-behaviour fact instead.
  it('Branch B: both DST but gap constant (est↔cst stay locked)', () => {
    const d = buildPairDescription(pair('est-to-cst'));
    expect(d).toContain('CST is 1 hour behind EST');
    expect(d).toContain('Both shift for daylight saving, so the gap holds year-round');
    expect(d).not.toMatch(/during/);
  });

  it('Branch B: city pair with aligned DST stays constant (new-york↔london)', () => {
    const d = buildPairDescription(pair('new-york-to-london'));
    expect(d).toContain('London is 5 hours ahead of New York');
    expect(d).not.toMatch(/during/);
  });

  // Every branch must stay within the ~150-char meta-description budget and lead
  // with the destination zone.
  it.each([
    'est-to-ist',
    'ist-to-est',
    'est-to-cst',
    'ist-to-gst',
    'new-york-to-london',
    'est-to-tokyo',
  ])('within budget and answer-first: %s', (slug) => {
    const p = pair(slug);
    const d = buildPairDescription(p);
    expect(d.length).toBeLessThanOrEqual(150);
    // Leads with the destination token (zone abbreviation or city name).
    const toLabel =
      p.to.kind === 'zone'
        ? (p.to.zone.abbreviations[0] ?? p.to.zone.id.toUpperCase())
        : p.to.city.name;
    expect(d.startsWith(toLabel)).toBe(true);
  });
});
