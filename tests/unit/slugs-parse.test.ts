import { describe, expect, it } from 'vitest';
import { parsePairSlug, resolveSlugSegment } from '@/lib/slugs/parse';

describe('parsePairSlug', () => {
  it('parses zone/zone pairs', () => {
    const r = parsePairSlug('pst-to-est');
    expect(r?.from.kind).toBe('zone');
    expect(r?.to.kind).toBe('zone');
    expect(r?.fromIana).toBe('America/Los_Angeles');
    expect(r?.toIana).toBe('America/New_York');
  });

  it('parses city/city pairs', () => {
    const r = parsePairSlug('new-york-to-tokyo');
    expect(r?.from.kind).toBe('city');
    expect(r?.to.kind).toBe('city');
    expect(r?.fromIana).toBe('America/New_York');
    expect(r?.toIana).toBe('Asia/Tokyo');
  });

  it('parses mixed zone+city pairs', () => {
    const r = parsePairSlug('pst-to-tokyo');
    expect(r?.from.kind).toBe('zone');
    expect(r?.to.kind).toBe('city');
    expect(r?.fromIana).toBe('America/Los_Angeles');
    expect(r?.toIana).toBe('Asia/Tokyo');
  });

  it('returns null for empty string', () => {
    expect(parsePairSlug('')).toBeNull();
  });

  it('returns null when one side is empty', () => {
    expect(parsePairSlug('pst-to-')).toBeNull();
    expect(parsePairSlug('-to-est')).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(parsePairSlug('garbage')).toBeNull();
    expect(parsePairSlug('foo-to-bar-zinger')).toBeNull();
  });
});

describe('resolveSlugSegment', () => {
  it('returns a city for known city slugs', () => {
    const r = resolveSlugSegment('tokyo');
    expect(r?.kind).toBe('city');
  });

  it('returns a zone for known zone slugs', () => {
    const r = resolveSlugSegment('pst');
    expect(r?.kind).toBe('zone');
  });

  it('returns null for empty input', () => {
    expect(resolveSlugSegment('')).toBeNull();
  });

  it('returns null for unknown segments', () => {
    expect(resolveSlugSegment('not-a-thing')).toBeNull();
  });
});
