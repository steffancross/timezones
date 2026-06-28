import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { writeAvailability } from '@/lib/rooms/availability';
import { emptyWeek, serializeDay } from '@/lib/rooms/blob';
import { createRoom, readRoomState } from '@/lib/rooms/db';
import { createParticipant, ParticipantNotFoundError } from '@/lib/rooms/identity';
import { InvalidInput } from '@/lib/rooms/validation';

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM participants'),
    env.DB.prepare('DELETE FROM rooms'),
  ]);
});

async function seedParticipant(now = 1000) {
  const { id: roomId } = await createRoom(env.DB, null, now);
  const { youId } = await createParticipant(
    env.DB,
    roomId,
    { name: 'Maya', timezone: 'America/New_York' },
    'secret-A',
    now,
  );
  return { roomId, youId };
}

const lastActiveAt = async (roomId: string) =>
  (
    await env.DB.prepare('SELECT last_active_at FROM rooms WHERE id = ?')
      .bind(roomId)
      .first<{ last_active_at: number }>()
  )?.last_active_at;

const participant = async (roomId: string, id: string) =>
  (await readRoomState(env.DB, roomId))?.participants.find((p) => p.id === id);

const DAY_Y = serializeDay(Array(48).fill('y'));

describe('writeAvailability — general week', () => {
  it('writes the blob, flips first-response, and bumps last_active_at', async () => {
    const { roomId, youId } = await seedParticipant(1000);
    expect((await participant(roomId, youId))?.hasResponded).toBe(false);

    const week = emptyWeek();
    await writeAvailability(env.DB, roomId, youId, { generalWeek: week }, 5000);

    const me = await participant(roomId, youId);
    expect(me?.generalWeek).toBe(week);
    expect(me?.hasResponded).toBe(true); // first write set availability_set_at
    expect(await lastActiveAt(roomId)).toBe(5000);
  });
});

describe('writeAvailability — overrides set/clear', () => {
  it('round-trips an override and clears it', async () => {
    const { roomId, youId } = await seedParticipant();
    await writeAvailability(env.DB, roomId, youId, {
      overrides: { set: { '2026-06-18': DAY_Y } },
    });
    expect((await participant(roomId, youId))?.overrides).toEqual({ '2026-06-18': DAY_Y });

    await writeAvailability(env.DB, roomId, youId, { overrides: { clear: ['2026-06-18'] } });
    expect((await participant(roomId, youId))?.overrides).toEqual({});
  });
});

describe('writeAvailability — validation', () => {
  it('rejects a malformed general week', async () => {
    const { roomId, youId } = await seedParticipant();
    await expect(
      writeAvailability(env.DB, roomId, youId, { generalWeek: 'nope' }),
    ).rejects.toBeInstanceOf(InvalidInput);
  });

  it('rejects an invalid override day and an over-cap overrides map', async () => {
    const { roomId, youId } = await seedParticipant();
    await expect(
      writeAvailability(env.DB, roomId, youId, { overrides: { set: { '2026-06-18': 'short' } } }),
    ).rejects.toBeInstanceOf(InvalidInput);

    // ~200 distinct full days blows past MAX_OVERRIDES_BYTES (8 KB).
    const huge: Record<string, string> = {};
    for (let i = 0; i < 200; i++) {
      const year = 2027 + (i % 4); // 2027–2030
      const month = (Math.floor(i / 4) % 12) + 1;
      const day = (Math.floor(i / 48) % 28) + 1;
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      huge[key] = DAY_Y;
    }
    await expect(
      writeAvailability(env.DB, roomId, youId, { overrides: { set: huge } }),
    ).rejects.toBeInstanceOf(InvalidInput);
  });

  it('rejects writing to a participant that does not exist', async () => {
    const { roomId } = await seedParticipant();
    await expect(
      writeAvailability(env.DB, roomId, 'no-such-participant', { generalWeek: emptyWeek() }),
    ).rejects.toBeInstanceOf(ParticipantNotFoundError);
  });
});
