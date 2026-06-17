import { sha256Base64url, verifyPassword } from '@/lib/rooms/crypto';
import { createRoom, readRoomState } from '@/lib/rooms/db';
import {
  claim,
  createParticipant,
  listClaimable,
  ParticipantNotFoundError,
  renameRoom,
  resolveMe,
  RoomFullError,
  RoomNotFoundError,
  updateIdentity,
} from '@/lib/rooms/identity';
import { allowAllRateLimiter, type RateLimiter } from '@/lib/rooms/rate-limit';
import { InvalidInput } from '@/lib/rooms/validation';
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

// Same clean-slate pattern as rooms.test.ts — this pool doesn't isolate D1 per-test.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM participants'),
    env.DB.prepare('DELETE FROM rooms'),
  ]);
});

// A deterministic in-memory limiter: the first `limit` calls per key are allowed,
// the rest blocked. Stands in for the native CF binding (absent under Miniflare).
function fakeLimiter(limit: number): RateLimiter {
  const counts = new Map<string, number>();
  return {
    check: async (key) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return { allowed: next <= limit };
    },
  };
}

async function lastSeenAt(participantId: string): Promise<number | undefined> {
  const row = await env.DB.prepare('SELECT last_seen_at FROM participants WHERE id = ?')
    .bind(participantId)
    .first<{ last_seen_at: number }>();
  return row?.last_seen_at;
}

async function lastActiveAt(roomId: string): Promise<number | undefined> {
  const row = await env.DB.prepare('SELECT last_active_at FROM rooms WHERE id = ?')
    .bind(roomId)
    .first<{ last_active_at: number }>();
  return row?.last_active_at;
}

describe('resolveMe', () => {
  it('returns the participant for a matching secret and bumps last_seen_at', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'America/Los_Angeles' },
      'secret-A',
      1000,
    );
    expect(await lastSeenAt(youId)).toBe(1000);

    const me = await resolveMe(env.DB, roomId, 'secret-A', 5000);
    expect(me).toEqual({ participantId: youId });
    expect(await lastSeenAt(youId)).toBe(5000);
  });

  it('is a lurker (null) for a wrong or absent secret', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    await createParticipant(env.DB, roomId, { name: 'Maya', timezone: 'Asia/Tokyo' }, 'secret-A');
    expect(await resolveMe(env.DB, roomId, 'not-the-secret')).toBeNull();
    expect(await resolveMe(env.DB, roomId, null)).toBeNull();
  });

  it('scopes identity per room — the same secret resolves independently in each', async () => {
    const a = await createRoom(env.DB, 'A');
    const b = await createRoom(env.DB, 'B');
    const inA = await createParticipant(
      env.DB,
      a.id,
      { name: 'Maya', timezone: 'Asia/Tokyo' },
      'shared',
    );
    const inB = await createParticipant(
      env.DB,
      b.id,
      { name: 'Maya', timezone: 'Asia/Tokyo' },
      'shared',
    );

    expect(await resolveMe(env.DB, a.id, 'shared')).toEqual({ participantId: inA.youId });
    expect(await resolveMe(env.DB, b.id, 'shared')).toEqual({ participantId: inB.youId });
    expect(inA.youId).not.toBe(inB.youId);
  });

  it('a secret bound only in room A does not resolve in room B', async () => {
    const a = await createRoom(env.DB, 'A');
    const b = await createRoom(env.DB, 'B');
    await createParticipant(env.DB, a.id, { name: 'Maya', timezone: 'Asia/Tokyo' }, 'only-in-A');
    expect(await resolveMe(env.DB, b.id, 'only-in-A')).toBeNull();
  });
});

describe('createParticipant', () => {
  it('creates an unresponded row visible in room state, with youId === id', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { participant, youId } = await createParticipant(
      env.DB,
      roomId,
      { name: '  Theo  ', timezone: 'Asia/Tokyo' },
      'secret-A',
    );
    expect(youId).toBe(participant.id);
    expect(participant).toMatchObject({
      displayName: 'Theo', // trimmed
      timezone: 'Asia/Tokyo',
      generalWeek: null,
      overrides: {},
      hasResponded: false,
      hasPassword: false,
    });

    const state = await readRoomState(env.DB, roomId);
    expect(state?.participants).toHaveLength(1);
    expect(state?.participants[0]?.id).toBe(youId);
  });

  it('stores the secret HASH, never the raw secret', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'Asia/Tokyo' },
      'secret-A',
    );
    const row = await env.DB.prepare('SELECT secret_hash FROM participants WHERE id = ?')
      .bind(youId)
      .first<{ secret_hash: string }>();
    expect(row?.secret_hash).toBe(await sha256Base64url('secret-A'));
    expect(row?.secret_hash).not.toBe('secret-A');
  });

  it('hashes an optional password with PBKDF2 and flips hasPassword', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { participant, youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'Asia/Tokyo', password: 'supersecret' },
      'secret-A',
    );
    expect(participant.hasPassword).toBe(true);
    const row = await env.DB.prepare('SELECT password_hash FROM participants WHERE id = ?')
      .bind(youId)
      .first<{ password_hash: string }>();
    expect(row?.password_hash?.startsWith('pbkdf2$')).toBe(true);
    expect(row?.password_hash).not.toContain('supersecret');
    expect(await verifyPassword('supersecret', row?.password_hash ?? '')).toBe(true);
  });

  it('bumps the room last_active_at', async () => {
    const { id: roomId } = await createRoom(env.DB, null, 1000);
    expect(await lastActiveAt(roomId)).toBe(1000);
    await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'Asia/Tokyo' },
      'secret-A',
      5000,
    );
    expect(await lastActiveAt(roomId)).toBe(5000);
  });

  it('enforces the participant cap (101st rejected, no extra row)', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    // Seed 100 rows directly (fast — skips per-row crypto).
    const stmt = env.DB.prepare(
      `INSERT INTO participants
         (id, room_id, display_name, timezone, general_week, overrides,
          availability_set_at, password_hash, secret_hash, created_at, last_seen_at)
       VALUES (?, ?, 'P', 'UTC', NULL, '{}', NULL, NULL, ?, 1000, 1000)`,
    );
    await env.DB.batch(
      Array.from({ length: 100 }, (_, i) => stmt.bind(`p${i}`, roomId, `hash${i}`)),
    );

    await expect(
      createParticipant(env.DB, roomId, { name: 'Overflow', timezone: 'UTC' }, 'secret-A'),
    ).rejects.toBeInstanceOf(RoomFullError);

    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?')
      .bind(roomId)
      .first<{ n: number }>();
    expect(count?.n).toBe(100);
  });

  it('rejects an unknown room and invalid input', async () => {
    await expect(
      createParticipant(env.DB, 'no-such-room', { name: 'Maya', timezone: 'UTC' }, 'secret-A'),
    ).rejects.toBeInstanceOf(RoomNotFoundError);

    const { id: roomId } = await createRoom(env.DB, null);
    await expect(
      createParticipant(env.DB, roomId, { name: '', timezone: 'UTC' }, 'secret-A'),
    ).rejects.toBeInstanceOf(InvalidInput);
    await expect(
      createParticipant(env.DB, roomId, { name: 'Maya', timezone: 'Mars/Base' }, 'secret-A'),
    ).rejects.toBeInstanceOf(InvalidInput);
  });
});

describe('updateIdentity', () => {
  it('updates name and timezone', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'Asia/Tokyo' },
      'secret-A',
    );
    const updated = await updateIdentity(env.DB, roomId, youId, {
      name: 'Maya R.',
      timezone: 'Europe/Berlin',
    });
    expect(updated).toMatchObject({ displayName: 'Maya R.', timezone: 'Europe/Berlin' });
    const state = await readRoomState(env.DB, roomId);
    expect(state?.participants[0]).toMatchObject({
      displayName: 'Maya R.',
      timezone: 'Europe/Berlin',
    });
  });

  it('sets then clears a password (null = clear)', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'UTC' },
      'secret-A',
    );

    const set = await updateIdentity(env.DB, roomId, youId, { password: 'newpassword' });
    expect(set.hasPassword).toBe(true);

    const cleared = await updateIdentity(env.DB, roomId, youId, { password: null });
    expect(cleared.hasPassword).toBe(false);
    const row = await env.DB.prepare('SELECT password_hash FROM participants WHERE id = ?')
      .bind(youId)
      .first<{ password_hash: string | null }>();
    expect(row?.password_hash).toBeNull();
  });

  it('does NOT bump the room last_active_at (identity tweaks are not room writes)', async () => {
    const { id: roomId } = await createRoom(env.DB, null, 1000);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'UTC' },
      'secret-A',
      1000,
    );
    expect(await lastActiveAt(roomId)).toBe(1000);
    await updateIdentity(env.DB, roomId, youId, { name: 'Maya 2' });
    expect(await lastActiveAt(roomId)).toBe(1000);
  });

  it('rejects an unknown participant and invalid input', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    await expect(updateIdentity(env.DB, roomId, 'nope', { name: 'X' })).rejects.toBeInstanceOf(
      ParticipantNotFoundError,
    );
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'UTC' },
      'secret-A',
    );
    await expect(
      updateIdentity(env.DB, roomId, youId, { timezone: 'Nowhere/Land' }),
    ).rejects.toBeInstanceOf(InvalidInput);
  });
});

describe('renameRoom', () => {
  it('renames and bumps last_active_at', async () => {
    const { id: roomId } = await createRoom(env.DB, 'Old', 1000);
    const result = await renameRoom(env.DB, roomId, '  New name  ', 9000);
    expect(result).toEqual({ id: roomId, name: 'New name' });
    const state = await readRoomState(env.DB, roomId);
    expect(state?.room.name).toBe('New name');
    expect(await lastActiveAt(roomId)).toBe(9000);
  });

  it('rejects unknown room and empty name', async () => {
    await expect(renameRoom(env.DB, 'nope', 'X')).rejects.toBeInstanceOf(RoomNotFoundError);
    const { id: roomId } = await createRoom(env.DB, null);
    await expect(renameRoom(env.DB, roomId, '   ')).rejects.toBeInstanceOf(InvalidInput);
  });
});

describe('listClaimable', () => {
  it('lists participants with timezone distinguisher and hasPassword, no secrets', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    await createParticipant(env.DB, roomId, { name: 'Maya', timezone: 'Asia/Tokyo' }, 'secret-A');
    await createParticipant(
      env.DB,
      roomId,
      { name: 'Theo', timezone: 'Europe/Berlin', password: 'theopassword' },
      'secret-B',
    );

    const claimable = await listClaimable(env.DB, roomId);
    expect(claimable).toHaveLength(2);
    expect(claimable[0]).toMatchObject({
      displayName: 'Maya',
      distinguisher: 'Asia/Tokyo',
      hasPassword: false,
    });
    expect(claimable[1]).toMatchObject({
      displayName: 'Theo',
      distinguisher: 'Europe/Berlin',
      hasPassword: true,
    });

    const json = JSON.stringify(claimable);
    for (const banned of ['secret_hash', 'password_hash', 'pbkdf2', 'last_seen_at']) {
      expect(json).not.toContain(banned);
    }
  });
});

describe('claim', () => {
  it('rebinds a passwordless participant to the new device; old secret becomes a lurker', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'UTC' },
      'old-secret',
    );

    const result = await claim(
      env.DB,
      roomId,
      youId,
      undefined,
      'new-secret',
      allowAllRateLimiter,
      'k',
    );
    expect(result).toEqual({ youId });

    expect(await resolveMe(env.DB, roomId, 'new-secret')).toEqual({ participantId: youId });
    expect(await resolveMe(env.DB, roomId, 'old-secret')).toBeNull();
  });

  it('requires the correct password for a passworded participant and does not rebind on failure', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'UTC', password: 'rightpassword' },
      'old-secret',
    );

    const bad = await claim(
      env.DB,
      roomId,
      youId,
      'wrongpassword',
      'new-secret',
      allowAllRateLimiter,
      'k',
    );
    expect(bad).toEqual({ error: 'bad_password' });
    expect(await resolveMe(env.DB, roomId, 'new-secret')).toBeNull();
    expect(await resolveMe(env.DB, roomId, 'old-secret')).toEqual({ participantId: youId });

    const ok = await claim(
      env.DB,
      roomId,
      youId,
      'rightpassword',
      'new-secret',
      allowAllRateLimiter,
      'k',
    );
    expect(ok).toEqual({ youId });
    expect(await resolveMe(env.DB, roomId, 'new-secret')).toEqual({ participantId: youId });
  });

  it('returns not_found for an unknown participant', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const result = await claim(
      env.DB,
      roomId,
      'nope',
      undefined,
      'new-secret',
      allowAllRateLimiter,
      'k',
    );
    expect(result).toEqual({ error: 'not_found' });
  });

  it('rate-limits before verifying — the over-limit attempt short-circuits to rate_limited', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const { youId } = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'UTC', password: 'rightpassword' },
      'old-secret',
    );
    const limiter = fakeLimiter(5);

    // First 5 wrong guesses are allowed through to the (failing) password check.
    for (let i = 0; i < 5; i++) {
      const r = await claim(
        env.DB,
        roomId,
        youId,
        'wrongpassword',
        'new-secret',
        limiter,
        'same-key',
      );
      expect(r).toEqual({ error: 'bad_password' });
    }
    // The 6th is blocked BEFORE verify — proven by getting rate_limited, not bad_password.
    const blocked = await claim(
      env.DB,
      roomId,
      youId,
      'wrongpassword',
      'new-secret',
      limiter,
      'same-key',
    );
    expect(blocked).toEqual({ error: 'rate_limited' });
  });
});

describe('no secrets leak through identity op return values', () => {
  it('createParticipant / updateIdentity / claim outputs never contain secret material', async () => {
    const { id: roomId } = await createRoom(env.DB, null);
    const created = await createParticipant(
      env.DB,
      roomId,
      { name: 'Maya', timezone: 'UTC', password: 'leaktestpw' },
      'secret-A',
    );
    const updated = await updateIdentity(env.DB, roomId, created.youId, { name: 'Maya 2' });
    const claimed = await claim(
      env.DB,
      roomId,
      created.youId,
      'leaktestpw',
      'new-secret',
      allowAllRateLimiter,
      'k',
    );

    const json = JSON.stringify({ created, updated, claimed });
    for (const banned of [
      'secret_hash',
      'password_hash',
      'pbkdf2',
      'availability_set_at',
      'last_seen_at',
      'secret-A',
      'leaktestpw',
    ]) {
      expect(json).not.toContain(banned);
    }
  });
});
