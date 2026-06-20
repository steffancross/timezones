import { describe, expect, it } from 'vitest';
import { contentPhase, respondedParticipants } from '@/lib/rooms/content-state';
import type { PublicParticipant } from '@/lib/rooms/db';

const p = (id: string, hasResponded: boolean): PublicParticipant => ({
  id,
  displayName: id,
  timezone: 'UTC',
  generalWeek: hasResponded ? 'n'.repeat(336) : null,
  overrides: {},
  hasResponded,
  hasPassword: false,
});

describe('contentPhase — keys off responders, not named participants', () => {
  it('zero responders → empty (even with named-but-unpainted people)', () => {
    expect(contentPhase([])).toBe('empty');
    expect(contentPhase([p('a', false), p('b', false)])).toBe('empty');
  });

  it('one responder → solo (unresponded people ignored)', () => {
    expect(contentPhase([p('a', true)])).toBe('solo');
    expect(contentPhase([p('a', true), p('b', false)])).toBe('solo');
  });

  it('two or more responders → group', () => {
    expect(contentPhase([p('a', true), p('b', true)])).toBe('group');
    expect(contentPhase([p('a', true), p('b', true), p('c', false)])).toBe('group');
  });

  it('respondedParticipants returns only those who have filled', () => {
    expect(respondedParticipants([p('a', true), p('b', false)]).map((x) => x.id)).toEqual(['a']);
  });
});
