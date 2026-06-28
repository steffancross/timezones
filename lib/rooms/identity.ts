// Identity & join D1 operations (spec 2). Like db.ts (spec 1), every op takes an
// explicit `D1Database` and no OpenNext import, so the worker-pool integration
// tests drive them against `cloudflare:test`'s env.DB with no mocking. Route
// handlers stay thin: parse the cookie, fetch the binding, call one of these.
//
// Identity is per-room: a participant is found by (room_id, secret_hash), so the
// same cookie secret in two different rooms resolves to two different rows (or
// none) — the multi-room-same-device guarantee lives in that WHERE clause.

import { MAX_PARTICIPANTS_PER_ROOM } from './config';
import { hashPassword, sha256Base64url, verifyPassword } from './crypto';
import type { PublicParticipant } from './db';
import { generateParticipantId } from './id';
import type { RateLimiter } from './rate-limit';
import { InvalidInput, validateName, validatePasswordField, validateTimezone } from './validation';

// --- typed failures (handlers map these to status codes) -------------------

export class RoomNotFoundError extends Error {
  constructor() {
    super('room not found');
    this.name = 'RoomNotFoundError';
  }
}

export class ParticipantNotFoundError extends Error {
  constructor() {
    super('participant not found');
    this.name = 'ParticipantNotFoundError';
  }
}

export class RoomFullError extends Error {
  constructor() {
    super('room is full');
    this.name = 'RoomFullError';
  }
}

// Re-export so handlers can `catch (e) { if (e instanceof InvalidInput) ... }`
// from one module.
export { InvalidInput };

// --- internal row projection (mirrors readRoomState's public shape) --------

type PublicParticipantRow = {
  id: string;
  display_name: string;
  timezone: string;
  general_week: string | null;
  overrides: string;
  has_responded: number;
  has_password: number;
};

const PUBLIC_PARTICIPANT_COLUMNS = `id, display_name, timezone, general_week, overrides,
  (availability_set_at IS NOT NULL) AS has_responded,
  (password_hash IS NOT NULL) AS has_password`;

function toPublicParticipant(r: PublicParticipantRow): PublicParticipant {
  return {
    id: r.id,
    displayName: r.display_name,
    timezone: r.timezone,
    generalWeek: r.general_week,
    overrides: JSON.parse(r.overrides),
    hasResponded: r.has_responded === 1,
    hasPassword: r.has_password === 1,
  };
}

async function readPublicParticipant(
  db: D1Database,
  roomId: string,
  participantId: string,
): Promise<PublicParticipant | null> {
  const row = await db
    .prepare(`SELECT ${PUBLIC_PARTICIPANT_COLUMNS} FROM participants WHERE id = ? AND room_id = ?`)
    .bind(participantId, roomId)
    .first<PublicParticipantRow>();
  return row ? toPublicParticipant(row) : null;
}

// --- resolve "me" ----------------------------------------------------------

/**
 * Who is this cookie in this room? Hash the secret, look up by (room_id,
 * secret_hash). On a hit, bump last_seen_at and return the participant id; on a
 * miss (or no cookie) the caller is a lurker (null). The (room_id, ...) scoping
 * is what keeps two rooms in one browser from cross-attributing.
 */
export async function resolveMe(
  db: D1Database,
  roomId: string,
  secret: string | null,
  now: number = Date.now(),
): Promise<{ participantId: string } | null> {
  if (!secret) return null;
  const secretHash = await sha256Base64url(secret);
  const row = await db
    .prepare('SELECT id FROM participants WHERE room_id = ? AND secret_hash = ?')
    .bind(roomId, secretHash)
    .first<{ id: string }>();
  if (!row) return null;

  await db.prepare('UPDATE participants SET last_seen_at = ? WHERE id = ?').bind(now, row.id).run();
  return { participantId: row.id };
}

// --- create (lazy, on name-commit) -----------------------------------------

/**
 * Create the participant row that turns a lurker into someone. Availability is
 * left NULL (written later by spec 5's paint-save). Binds secret_hash to this
 * device's cookie secret, enforces the participant cap with a count-guarded
 * conditional insert (race-safe), and bumps the room's last_active_at.
 */
export async function createParticipant(
  db: D1Database,
  roomId: string,
  input: { name: unknown; timezone: unknown; password?: unknown },
  secret: string,
  now: number = Date.now(),
): Promise<{ participant: PublicParticipant; youId: string }> {
  const name = validateName(input.name);
  const timezone = validateTimezone(input.timezone);
  const password = validatePasswordField(input.password);
  if (password === null) {
    // null means "clear" on update; on create there's nothing to clear.
    throw new InvalidInput('password cannot be null on create');
  }

  const id = generateParticipantId();
  const secretHash = await sha256Base64url(secret);
  const passwordHash = password === undefined ? null : await hashPassword(password);

  // Insert only if the room exists AND it's under the cap — both folded into the
  // WHERE so concurrent inserts can't both slip past a separate count check.
  const result = await db
    .prepare(
      `INSERT INTO participants
         (id, room_id, display_name, timezone, general_week, overrides,
          availability_set_at, password_hash, secret_hash, created_at, last_seen_at)
       SELECT ?, ?, ?, ?, NULL, '{}', NULL, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM rooms WHERE id = ?)
         AND (SELECT COUNT(*) FROM participants WHERE room_id = ?) < ?`,
    )
    .bind(
      id,
      roomId,
      name,
      timezone,
      passwordHash,
      secretHash,
      now,
      now,
      roomId,
      roomId,
      MAX_PARTICIPANTS_PER_ROOM,
    )
    .run();

  if (result.meta.changes !== 1) {
    // The insert was guarded out — figure out which guard failed.
    const room = await db.prepare('SELECT 1 FROM rooms WHERE id = ?').bind(roomId).first();
    if (!room) throw new RoomNotFoundError();
    throw new RoomFullError();
  }

  // Creating a participant is a room write — extend its TTL.
  await db.prepare('UPDATE rooms SET last_active_at = ? WHERE id = ?').bind(now, roomId).run();

  return {
    participant: {
      id,
      displayName: name,
      timezone,
      generalWeek: null,
      overrides: {},
      hasResponded: false,
      hasPassword: passwordHash !== null,
    },
    youId: id,
  };
}

// --- update identity / settings --------------------------------------------

/**
 * Update the resolved participant's name / timezone / password. `password:
 * undefined` leaves it; `null` clears it; a string sets it. Identity tweaks are
 * minor — they do NOT bump the room's last_active_at (only room-level and
 * availability writes do). Throws ParticipantNotFoundError if the row is gone.
 */
export async function updateIdentity(
  db: D1Database,
  roomId: string,
  participantId: string,
  patch: { name?: unknown; timezone?: unknown; password?: unknown },
): Promise<PublicParticipant> {
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (patch.name !== undefined) {
    sets.push('display_name = ?');
    values.push(validateName(patch.name));
  }
  if (patch.timezone !== undefined) {
    sets.push('timezone = ?');
    values.push(validateTimezone(patch.timezone));
  }
  const password = validatePasswordField(patch.password);
  if (password !== undefined) {
    sets.push('password_hash = ?');
    values.push(password === null ? null : await hashPassword(password));
  }

  if (sets.length > 0) {
    const result = await db
      .prepare(`UPDATE participants SET ${sets.join(', ')} WHERE id = ? AND room_id = ?`)
      .bind(...values, participantId, roomId)
      .run();
    if (result.meta.changes !== 1) throw new ParticipantNotFoundError();
  }

  const updated = await readPublicParticipant(db, roomId, participantId);
  if (!updated) throw new ParticipantNotFoundError();
  return updated;
}

// --- rename room (flat ownership) ------------------------------------------

/**
 * Rename the room. Flat ownership — any participant may do it. A room-level
 * write, so it bumps last_active_at. Throws RoomNotFoundError if the id is bad.
 */
export async function renameRoom(
  db: D1Database,
  roomId: string,
  name: unknown,
  now: number = Date.now(),
): Promise<{ id: string; name: string }> {
  const cleanName = validateName(name);
  const result = await db
    .prepare('UPDATE rooms SET name = ?, last_active_at = ? WHERE id = ?')
    .bind(cleanName, now, roomId)
    .run();
  if (result.meta.changes !== 1) throw new RoomNotFoundError();
  return { id: roomId, name: cleanName };
}

// --- recovery: list claimable participants ---------------------------------

export type ClaimableParticipant = {
  participantId: string;
  displayName: string;
  distinguisher: string; // the timezone — disambiguates two same-named people
  hasPassword: boolean;
};

/**
 * The room's participants for the new-device recovery picker. Public + safe:
 * never selects secret_hash / password_hash raw — only the derived hasPassword
 * boolean. `distinguisher` is the timezone (already on the row, human-meaningful).
 */
export async function listClaimable(
  db: D1Database,
  roomId: string,
): Promise<ClaimableParticipant[]> {
  const { results } = await db
    .prepare(
      `SELECT id, display_name, timezone, (password_hash IS NOT NULL) AS has_password
       FROM participants WHERE room_id = ?
       ORDER BY created_at ASC`,
    )
    .bind(roomId)
    .all<{ id: string; display_name: string; timezone: string; has_password: number }>();

  return results.map((r) => ({
    participantId: r.id,
    displayName: r.display_name,
    distinguisher: r.timezone,
    hasPassword: r.has_password === 1,
  }));
}

// --- claim (new-device recovery) -------------------------------------------

export type ClaimResult =
  | { youId: string }
  | { error: 'not_found' | 'bad_password' | 'rate_limited' };

/**
 * Re-claim an existing participant on a new device. Rate-limited FIRST (the one
 * password-guessing surface), then password-verified if the participant has one,
 * then the single secret_hash is rebound to this device's secret. v1 single-
 * secret semantics: rebinding makes the PREVIOUS device a lurker (it can
 * re-claim). Bumps last_seen_at on success.
 */
export async function claim(
  db: D1Database,
  roomId: string,
  participantId: string,
  password: string | undefined,
  newSecret: string,
  limiter: RateLimiter,
  rateLimitKey: string,
  now: number = Date.now(),
): Promise<ClaimResult> {
  // Gate before any lookup or PBKDF2 work so guessing is throttled cheaply.
  const { allowed } = await limiter.check(rateLimitKey);
  if (!allowed) return { error: 'rate_limited' };

  const row = await db
    .prepare('SELECT id, password_hash FROM participants WHERE id = ? AND room_id = ?')
    .bind(participantId, roomId)
    .first<{ id: string; password_hash: string | null }>();
  if (!row) return { error: 'not_found' };

  if (row.password_hash !== null) {
    if (!password || !(await verifyPassword(password, row.password_hash))) {
      return { error: 'bad_password' };
    }
  }

  const secretHash = await sha256Base64url(newSecret);
  await db
    .prepare('UPDATE participants SET secret_hash = ?, last_seen_at = ? WHERE id = ?')
    .bind(secretHash, now, row.id)
    .run();
  return { youId: row.id };
}
