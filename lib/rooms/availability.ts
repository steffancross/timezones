// The availability write path (spec 5) — the first writes into the blob. Pure D1
// op (explicit D1Database), reusing spec-1's validators wholesale so a malformed
// blob is rejected loudly. Only the resolved participant's own row is written
// (the handler passes the cookie-resolved id; there's no participant id in the
// payload), so there's nothing to authorize here.

import { type Overrides, parseWeek, validateOverrides } from './blob';
import type { PublicParticipant } from './db';
import { ParticipantNotFoundError, readPublicParticipant } from './identity';
import { InvalidInput } from './validation';

export type AvailabilityPatch = {
  generalWeek?: string;
  overrides?: { set?: Record<string, string>; clear?: string[] };
};

type Row = { general_week: string | null; overrides: string };

/** Validate blobs through spec-1's validators, re-throwing as InvalidInput (→ 400). */
function validate(generalWeek: string | undefined, overrides: Overrides): void {
  try {
    if (generalWeek !== undefined) parseWeek(generalWeek);
    validateOverrides(overrides); // charset + date-key shape + MAX_OVERRIDES_BYTES
  } catch (err) {
    throw new InvalidInput(err instanceof Error ? err.message : 'invalid availability');
  }
}

/**
 * Replace your general week and/or set/clear concrete-date overrides. The first
 * write stamps `availability_set_at` (→ hasResponded) via COALESCE; later writes
 * leave it. Bumps the room's last_active_at. Returns your updated public row.
 */
export async function writeAvailability(
  db: D1Database,
  roomId: string,
  participantId: string,
  patch: AvailabilityPatch,
  now: number = Date.now(),
): Promise<PublicParticipant> {
  const row = await db
    .prepare('SELECT general_week, overrides FROM participants WHERE id = ? AND room_id = ?')
    .bind(participantId, roomId)
    .first<Row>();
  if (!row) throw new ParticipantNotFoundError();

  // Merge override set/clear onto the stored map.
  const nextOverrides: Overrides = { ...(JSON.parse(row.overrides) as Overrides) };
  for (const date of patch.overrides?.clear ?? []) delete nextOverrides[date];
  for (const [date, day] of Object.entries(patch.overrides?.set ?? {})) nextOverrides[date] = day;

  validate(patch.generalWeek, nextOverrides);

  const nextGeneral = patch.generalWeek ?? row.general_week;
  const isWrite = patch.generalWeek !== undefined || patch.overrides !== undefined;

  const result = await db
    .prepare(
      `UPDATE participants
         SET general_week = ?, overrides = ?,
             availability_set_at = COALESCE(availability_set_at, ?), last_seen_at = ?
       WHERE id = ? AND room_id = ?`,
    )
    // COALESCE(set_at, null) keeps the existing value — so an empty patch never
    // flips an unresponded participant to responded.
    .bind(
      nextGeneral,
      JSON.stringify(nextOverrides),
      isWrite ? now : null,
      now,
      participantId,
      roomId,
    )
    .run();
  if (result.meta.changes !== 1) throw new ParticipantNotFoundError();

  // Availability is a room write — extend the TTL.
  await db.prepare('UPDATE rooms SET last_active_at = ? WHERE id = ?').bind(now, roomId).run();

  const updated = await readPublicParticipant(db, roomId, participantId);
  if (!updated) throw new ParticipantNotFoundError();
  return updated;
}
