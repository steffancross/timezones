import { describe, expect, it } from 'vitest';
import { randomHandle } from '@/lib/rooms/handles';

describe('randomHandle', () => {
  it('returns a two-word "Adjective Noun" handle', () => {
    const handle = randomHandle();
    const words = handle.split(' ');
    expect(words).toHaveLength(2);
    expect(words[0]).toBeTruthy();
    expect(words[1]).toBeTruthy();
    // Title-cased words.
    expect(handle).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
});
