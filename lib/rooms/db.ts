// D1 operations + the public read shape (spec 1).
//
// Every operation takes an explicit `D1Database` so it's unit-testable against
// `cloudflare:test`'s `env.DB` with no mocking. Route handlers get the binding
// from `getDb()`, the single place this app reaches into the Cloudflare context.

import { BLOB_VERSION, ROOM_TTL_MS } from './config';
import type { Overrides } from './blob';
import { generateRoomId } from './id';

// Every operation takes an explicit `D1Database` (no Cloudflare-context import
// here) so the worker-pool integration tests can drive these against
// `cloudflare:test`'s `env.DB` without bundling OpenNext. Request handlers get
// the binding from `getDb()` in ./context.

// --- The frozen public read contract (consumed by specs 3–6) ---------------

export type PublicParticipant = {
  id: string;
  displayName: string;
  timezone: string; // IANA
  generalWeek: string | null; // 336-char blob, or null if unset
  overrides: Overrides;
  hasResponded: boolean; // availability_set_at != null
  hasPassword: boolean; // password_hash != null (recovery UI needs this)
};

export type RoomState = {
  room: { id: string; name: string | null; schemaVersion: number };
  participants: PublicParticipant[];
};

// --- Row shapes (internal) -------------------------------------------------

type RoomRow = { id: string; name: string | null; schema_version: number };

// Note: secret_hash, password_hash, availability_set_at, last_seen_at are
// DELIBERATELY not selected — they must never leave the server. We derive the
// has_responded / has_password booleans in SQL so the raw values never enter JS.
type ParticipantRow = {
  id: string;
  display_name: string;
  timezone: string;
  general_week: string | null;
  overrides: string;
  has_responded: number; // 0 | 1
  has_password: number; // 0 | 1
};

/**
 * Create a room. The id is the only access control, so it's high-entropy and
 * unguessable. Collision is astronomically unlikely; a single regenerate-retry
 * on a UNIQUE violation is sufficient defensiveness. `last_active_at` starts
 * equal to `created_at` (the create is itself a write).
 */
export async function createRoom(
  db: D1Database,
  name?: string | null,
  now: number = Date.now(),
): Promise<{ id: string }> {
  const stmt = db.prepare(
    'INSERT INTO rooms (id, name, created_at, last_active_at, schema_version) VALUES (?, ?, ?, ?, ?)',
  );
  for (let attempt = 0; attempt < 2; attempt++) {
    const id = generateRoomId();
    try {
      await stmt.bind(id, name ?? null, now, now, BLOB_VERSION).run();
      return { id };
    } catch (err) {
      // Only retry on a uniqueness collision; rethrow anything else.
      if (attempt === 1 || !/UNIQUE|constraint/i.test(String(err))) throw err;
    }
  }
  // Unreachable — the loop either returns or throws.
  throw new Error('createRoom: exhausted id retries');
}

/**
 * Read the full public state of a room, or null if it doesn't exist (bad id or
 * TTL-deleted). Exposes only public fields + the hasResponded / hasPassword
 * booleans — never any secret/hash/raw-timestamp. Does NOT bump last_active_at:
 * reads never extend a room's life.
 */
export async function readRoomState(db: D1Database, roomId: string): Promise<RoomState | null> {
  const room = await db
    .prepare('SELECT id, name, schema_version FROM rooms WHERE id = ?')
    .bind(roomId)
    .first<RoomRow>();
  if (!room) return null;

  const { results } = await db
    .prepare(
      `SELECT id, display_name, timezone, general_week, overrides,
              (availability_set_at IS NOT NULL) AS has_responded,
              (password_hash IS NOT NULL) AS has_password
       FROM participants WHERE room_id = ?
       ORDER BY created_at ASC`,
    )
    .bind(roomId)
    .all<ParticipantRow>();

  const participants: PublicParticipant[] = results.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    timezone: r.timezone,
    generalWeek: r.general_week,
    overrides: JSON.parse(r.overrides) as Overrides,
    hasResponded: r.has_responded === 1,
    hasPassword: r.has_password === 1,
  }));

  return {
    room: { id: room.id, name: room.name, schemaVersion: room.schema_version },
    participants,
  };
}

/**
 * The inactivity-TTL janitor. Manually triggered (no cron) — see the admin
 * endpoint and spec 1. Deletes participants of stale rooms first (explicit,
 * don't trust FK cascade, since D1 enforces FKs only with PRAGMA foreign_keys=ON
 * per connection), then the stale rooms. Returns how many of each were removed.
 */
export async function runJanitor(
  db: D1Database,
  now: number = Date.now(),
): Promise<{ rooms: number; participants: number }> {
  const cutoff = now - ROOM_TTL_MS;
  // batch runs both statements in one transaction, in order: participants of
  // stale rooms first (the subquery still sees those rooms), then the rooms.
  const results = await db.batch([
    db
      .prepare(
        'DELETE FROM participants WHERE room_id IN (SELECT id FROM rooms WHERE last_active_at < ?)',
      )
      .bind(cutoff),
    db.prepare('DELETE FROM rooms WHERE last_active_at < ?').bind(cutoff),
  ]);
  const [participantsResult, roomsResult] = results;
  return {
    participants: participantsResult?.meta.changes ?? 0,
    rooms: roomsResult?.meta.changes ?? 0,
  };
}
