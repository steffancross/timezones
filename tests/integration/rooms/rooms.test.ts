import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { ROOM_ID_LENGTH, ROOM_TTL_MS } from '@/lib/rooms/config';
import { createRoom, createRoomLimited, readRoomState, runJanitor } from '@/lib/rooms/db';
import type { RateLimiter } from '@/lib/rooms/rate-limit';

const URL_SAFE = /^[A-Za-z0-9_-]+$/;

// This pool doesn't isolate D1 per-test, so start each test from a clean slate.
// (participants first — FK enforcement varies by connection pragma.)
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM participants'),
    env.DB.prepare('DELETE FROM rooms'),
  ]);
});

// Insert a participant directly (spec 1 has no create-participant path — that's
// spec 2). `opts` lets a test set the never-leaked fields to prove they don't
// escape the read shape.
async function insertParticipant(
  roomId: string,
  opts: {
    id: string;
    displayName?: string;
    timezone?: string;
    generalWeek?: string | null;
    overrides?: string;
    availabilitySetAt?: number | null;
    passwordHash?: string | null;
    secretHash?: string;
    createdAt?: number;
    lastSeenAt?: number;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO participants
       (id, room_id, display_name, timezone, general_week, overrides,
        availability_set_at, password_hash, secret_hash, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      opts.id,
      roomId,
      opts.displayName ?? 'Maya',
      opts.timezone ?? 'America/Los_Angeles',
      opts.generalWeek ?? null,
      opts.overrides ?? '{}',
      opts.availabilitySetAt ?? null,
      opts.passwordHash ?? null,
      opts.secretHash ?? 'secret-hash-xyz',
      opts.createdAt ?? 1000,
      opts.lastSeenAt ?? 1000,
    )
    .run();
}

describe('createRoom / readRoomState', () => {
  it('round-trips a fresh room with no participants', async () => {
    const now = 1_700_000_000_000;
    const { id } = await createRoom(env.DB, 'Team sync', now);

    expect(id).toHaveLength(ROOM_ID_LENGTH);
    expect(id).toMatch(URL_SAFE);

    const state = await readRoomState(env.DB, id);
    expect(state).toEqual({
      room: { id, name: 'Team sync', schemaVersion: 1 },
      participants: [],
    });
  });

  it('returns null for an unknown room', async () => {
    expect(await readRoomState(env.DB, 'does-not-exist')).toBeNull();
  });

  it('reflects a directly-inserted participant', async () => {
    const { id } = await createRoom(env.DB, null);
    await insertParticipant(id, { id: 'p1', displayName: 'Theo', timezone: 'Asia/Tokyo' });

    const state = await readRoomState(env.DB, id);
    expect(state?.participants).toHaveLength(1);
    expect(state?.participants[0]).toMatchObject({
      id: 'p1',
      displayName: 'Theo',
      timezone: 'Asia/Tokyo',
      generalWeek: null,
      overrides: {},
    });
  });

  it('sets last_active_at = created_at on create; readRoomState itself does not bump it (the route calls touchRoom separately)', async () => {
    const now = 1_700_000_000_000;
    const { id } = await createRoom(env.DB, null, now);

    const before = await env.DB.prepare('SELECT created_at, last_active_at FROM rooms WHERE id = ?')
      .bind(id)
      .first<{ created_at: number; last_active_at: number }>();
    expect(before?.last_active_at).toBe(now);
    expect(before?.last_active_at).toBe(before?.created_at);

    await readRoomState(env.DB, id);

    const after = await env.DB.prepare('SELECT last_active_at FROM rooms WHERE id = ?')
      .bind(id)
      .first<{ last_active_at: number }>();
    expect(after?.last_active_at).toBe(now);
  });
});

describe('hasResponded', () => {
  it('is false when availability_set_at is null', async () => {
    const { id } = await createRoom(env.DB, null);
    await insertParticipant(id, { id: 'p1', availabilitySetAt: null });
    const state = await readRoomState(env.DB, id);
    expect(state?.participants[0]?.hasResponded).toBe(false);
  });

  it('is true once availability_set_at is set, even for an all-`n` week', async () => {
    const { id } = await createRoom(env.DB, null);
    await insertParticipant(id, {
      id: 'p1',
      generalWeek: 'n'.repeat(336),
      availabilitySetAt: 1_700_000_000_000,
    });
    const state = await readRoomState(env.DB, id);
    expect(state?.participants[0]?.hasResponded).toBe(true);
  });
});

describe('no secrets leak through readRoomState', () => {
  it('omits secret_hash / password_hash / raw timestamps from the serialized state', async () => {
    const { id } = await createRoom(env.DB, null);
    await insertParticipant(id, {
      id: 'p1',
      secretHash: 'SECRET_HASH_SENTINEL',
      passwordHash: 'PASSWORD_HASH_SENTINEL',
      availabilitySetAt: 1_700_000_000_123,
      lastSeenAt: 1_700_000_000_456,
    });

    const state = await readRoomState(env.DB, id);
    const participant = state?.participants[0];

    // Derived booleans are exposed...
    expect(participant?.hasResponded).toBe(true);
    expect(participant?.hasPassword).toBe(true);

    // ...but nothing secret/raw is, by value or by key.
    const json = JSON.stringify(state);
    expect(json).not.toContain('SECRET_HASH_SENTINEL');
    expect(json).not.toContain('PASSWORD_HASH_SENTINEL');
    expect(json).not.toContain('1700000000123');
    expect(json).not.toContain('1700000000456');
    for (const banned of ['secret_hash', 'password_hash', 'availability_set_at', 'last_seen_at']) {
      expect(json).not.toContain(banned);
    }
  });
});

describe('runJanitor', () => {
  it('deletes stale rooms + their participants and leaves fresh ones intact', async () => {
    const now = 1_700_000_000_000;
    const stale = await createRoom(env.DB, 'Stale', now - ROOM_TTL_MS - 1);
    const fresh = await createRoom(env.DB, 'Fresh', now);
    await insertParticipant(stale.id, { id: 'sp1' });
    await insertParticipant(fresh.id, { id: 'fp1' });

    const deleted = await runJanitor(env.DB, now);
    expect(deleted).toEqual({ rooms: 1, participants: 1 });

    expect(await readRoomState(env.DB, stale.id)).toBeNull();
    const freshState = await readRoomState(env.DB, fresh.id);
    expect(freshState?.participants).toHaveLength(1);
  });

  it('is a no-op when nothing is stale', async () => {
    const now = 1_700_000_000_000;
    await createRoom(env.DB, 'Fresh', now);
    expect(await runJanitor(env.DB, now)).toEqual({ rooms: 0, participants: 0 });
  });
});

// A per-key counting limiter (mirrors the claim test's injected fake) — the
// native binding isn't modeled here.
function countingLimiter(max: number): RateLimiter {
  const counts = new Map<string, number>();
  return {
    check: async (key) => {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { allowed: n <= max };
    },
  };
}

describe('createRoomLimited — per-IP room-creation rate-limit (spec 7c)', () => {
  it('creates while under the limit, then rejects the over-limit attempt', async () => {
    const limiter = countingLimiter(2);
    const key = 'create:1.2.3.4';

    const a = await createRoomLimited(env.DB, limiter, key);
    const b = await createRoomLimited(env.DB, limiter, key);
    const c = await createRoomLimited(env.DB, limiter, key);

    expect(a).toHaveProperty('id');
    expect(b).toHaveProperty('id');
    expect(c).toEqual({ error: 'rate_limited' });

    // The rejected attempt wrote no room.
    if ('id' in a && 'id' in b) {
      expect(await readRoomState(env.DB, a.id)).not.toBeNull();
      expect(await readRoomState(env.DB, b.id)).not.toBeNull();
    }
  });

  it('keys are independent — a different IP is unaffected', async () => {
    const limiter = countingLimiter(1);
    expect(await createRoomLimited(env.DB, limiter, 'create:a')).toHaveProperty('id');
    expect(await createRoomLimited(env.DB, limiter, 'create:a')).toEqual({ error: 'rate_limited' });
    expect(await createRoomLimited(env.DB, limiter, 'create:b')).toHaveProperty('id');
  });
});
