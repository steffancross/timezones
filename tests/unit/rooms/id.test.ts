import { describe, expect, it } from 'vitest';
import { ROOM_ID_LENGTH } from '@/lib/rooms/config';
import { generateRoomId } from '@/lib/rooms/id';

const URL_SAFE = /^[A-Za-z0-9_-]+$/;

describe('generateRoomId', () => {
  it('generates URL-safe ids of the configured length, all unique', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = generateRoomId();
      expect(id).toHaveLength(ROOM_ID_LENGTH);
      expect(id).toMatch(URL_SAFE);
      seen.add(id);
    }
    expect(seen.size).toBe(10_000);
  });
});
