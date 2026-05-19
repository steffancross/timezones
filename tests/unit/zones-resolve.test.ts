import { describe, expect, it } from 'vitest';
import { resolveZone } from '@/lib/zones/resolve';

describe('resolveZone', () => {
  it('matches by id slug', () => {
    const r = resolveZone('pst');
    expect(r?.matched_via).toBe('id');
    expect(r?.zone.iana).toBe('America/Los_Angeles');
  });

  it('matches by IANA (canonical case)', () => {
    const r = resolveZone('America/Los_Angeles');
    expect(r?.matched_via).toBe('iana');
    expect(r?.zone.id).toBe('pst');
  });

  it('matches by IANA (lowercased)', () => {
    const r = resolveZone('america/los_angeles');
    expect(r?.matched_via).toBe('iana');
    expect(r?.zone.id).toBe('pst');
  });

  it('matches by abbreviation (unambiguous)', () => {
    const r = resolveZone('PDT');
    expect(r?.matched_via).toBe('abbreviation');
    expect(r?.zone.id).toBe('pst');
    expect(r?.ambiguous).toBeUndefined();
  });

  it('returns the canonical zone for ambiguous CST', () => {
    const r = resolveZone('CST');
    expect(r?.zone.id).toBe('cst');
    expect(r?.zone.iana).toBe('America/Chicago');
    const ambIds = (r?.ambiguous ?? []).map((z) => z.id);
    expect(ambIds).toContain('cst-china');
  });

  it('returns the canonical zone for ambiguous BST (British wins)', () => {
    const r = resolveZone('BST');
    expect(r?.zone.id).toBe('gmt');
    expect((r?.ambiguous ?? []).map((z) => z.id)).toContain('bst-bangladesh');
  });

  it('returns the canonical zone for ambiguous AST (Arabia wins)', () => {
    const r = resolveZone('AST');
    expect(r?.zone.id).toBe('ast');
    expect((r?.ambiguous ?? []).map((z) => z.id)).toContain('ast-atlantic');
  });

  it('returns the canonical zone for ambiguous IST (India wins)', () => {
    const r = resolveZone('IST');
    expect(r?.zone.id).toBe('ist');
    expect((r?.ambiguous ?? []).map((z) => z.id)).toContain('ist-israel');
  });

  it('matches by alias', () => {
    const r = resolveZone('pacific time');
    expect(r?.matched_via).toBe('alias');
    expect(r?.zone.id).toBe('pst');
  });

  it('returns null for empty input', () => {
    expect(resolveZone('')).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(resolveZone('not-a-zone')).toBeNull();
  });
});

describe('zones data invariants', () => {
  it('has exactly one canonical zone per collision group', async () => {
    const { zones } = await import('@/data/zones');
    const groups = new Map<string, number>();
    for (const z of zones) {
      if (z.is_canonical_for_collision) {
        if (!z.collision_group) {
          throw new Error(`zone ${z.id} is canonical but has no collision_group`);
        }
        groups.set(z.collision_group, (groups.get(z.collision_group) ?? 0) + 1);
      }
    }
    for (const [g, n] of groups) expect(n, `group ${g}`).toBe(1);
  });

  it('has unique zone ids', async () => {
    const { zones } = await import('@/data/zones');
    const ids = new Set(zones.map((z) => z.id));
    expect(ids.size).toBe(zones.length);
  });
});
