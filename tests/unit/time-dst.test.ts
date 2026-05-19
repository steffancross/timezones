import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { getNextTransition, getTransitionsForYear, isTransitionUpcoming } from '@/lib/time/dst';

describe('getNextTransition', () => {
  it('returns a March or November transition for Los Angeles', () => {
    const next = getNextTransition('America/Los_Angeles');
    expect(next).not.toBeNull();
    expect([3, 11]).toContain(next?.date.month);
  });

  it('returns null for Tokyo (no DST)', () => {
    const next = getNextTransition('Asia/Tokyo');
    expect(next).toBeNull();
  });

  it('returns a 30-minute shift for Lord Howe Island', () => {
    const next = getNextTransition('Australia/Lord_Howe');
    expect(next).not.toBeNull();
    const diff = Math.abs((next?.offsetAfter ?? 0) - (next?.offsetBefore ?? 0));
    expect(diff).toBe(30);
  });

  it('walks into the following year if no transition remains in current year', () => {
    // Late December 2026 in LA: no more 2026 transitions, should fetch March 2027.
    const lateYear = DateTime.fromISO('2026-12-15T00:00', { zone: 'America/Los_Angeles' });
    const next = getNextTransition('America/Los_Angeles', lateYear);
    expect(next).not.toBeNull();
    expect(next?.date.year).toBe(2027);
    expect(next?.date.month).toBe(3);
  });
});

describe('getTransitionsForYear', () => {
  it('London 2026 has exactly 2 transitions', () => {
    const transitions = getTransitionsForYear('Europe/London', 2026);
    expect(transitions).toHaveLength(2);
    expect(transitions[0]?.direction).toBe('forward');
    expect(transitions[0]?.date.month).toBe(3);
    expect(transitions[1]?.direction).toBe('back');
    expect(transitions[1]?.date.month).toBe(10);
  });

  it('Tokyo any year returns 0 transitions', () => {
    expect(getTransitionsForYear('Asia/Tokyo', 2026)).toHaveLength(0);
  });

  it('Los Angeles 2026 transitions carry PST/PDT abbreviations', () => {
    const transitions = getTransitionsForYear('America/Los_Angeles', 2026);
    expect(transitions).toHaveLength(2);
    expect(transitions[0]?.abbreviationBefore).toBe('PST');
    expect(transitions[0]?.abbreviationAfter).toBe('PDT');
    expect(transitions[1]?.abbreviationBefore).toBe('PDT');
    expect(transitions[1]?.abbreviationAfter).toBe('PST');
  });

  it('returns reference-distinct arrays but reference-equal entries on cache hit', () => {
    const a = getTransitionsForYear('America/Los_Angeles', 2026);
    const b = getTransitionsForYear('America/Los_Angeles', 2026);
    expect(a).not.toBe(b);
    expect(a[0]).toBe(b[0]);
    expect(a[1]).toBe(b[1]);
  });
});

describe('cache behavior', () => {
  it('repeated getNextTransition calls return the same object reference (cache hit)', () => {
    const from = DateTime.fromISO('2027-01-01T00:00', { zone: 'America/Los_Angeles' });
    const a = getNextTransition('America/Los_Angeles', from);
    const b = getNextTransition('America/Los_Angeles', from);
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });
});

describe('isTransitionUpcoming', () => {
  it('returns true when transition is within window', () => {
    const now = DateTime.fromISO('2026-03-01T00:00');
    const transition = {
      date: DateTime.fromISO('2026-03-08T10:00'),
      direction: 'forward' as const,
      offsetBefore: -480,
      offsetAfter: -420,
      abbreviationBefore: 'PST',
      abbreviationAfter: 'PDT',
    };
    expect(isTransitionUpcoming(transition, 14, now)).toBe(true);
  });

  it('returns false when transition is past', () => {
    const now = DateTime.fromISO('2026-03-15T00:00');
    const transition = {
      date: DateTime.fromISO('2026-03-08T10:00'),
      direction: 'forward' as const,
      offsetBefore: -480,
      offsetAfter: -420,
      abbreviationBefore: 'PST',
      abbreviationAfter: 'PDT',
    };
    expect(isTransitionUpcoming(transition, 14, now)).toBe(false);
  });

  it('returns false when transition is beyond window', () => {
    const now = DateTime.fromISO('2026-01-01T00:00');
    const transition = {
      date: DateTime.fromISO('2026-03-08T10:00'),
      direction: 'forward' as const,
      offsetBefore: -480,
      offsetAfter: -420,
      abbreviationBefore: 'PST',
      abbreviationAfter: 'PDT',
    };
    expect(isTransitionUpcoming(transition, 14, now)).toBe(false);
  });
});
