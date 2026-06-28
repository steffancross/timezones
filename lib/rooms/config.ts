// Single source for every Availability Room constant. Lifecycle, abuse bounds,
// and the blob geometry all live here so they're configurable in one place
// (spec 1). Enforcement of the caps lives where the writes are (specs 2 / 5),
// but the numbers are defined once, here.

/** URL id length — ~125 bits over the URL-safe alphabet. Unguessable is the only access control. */
export const ROOM_ID_LENGTH = 21;

/** Inactivity TTL. A room nobody writes to for this long is reaped by the manual janitor. */
export const ROOM_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

/** Blob format version, mirrored into `rooms.schema_version`. Bump only via a real migration. */
export const BLOB_VERSION = 1;

/** Abuse bound for the public write path. Enforced at join (spec 2). */
export const MAX_PARTICIPANTS_PER_ROOM = 100;

/** Per-participant cap on the serialized overrides JSON. Enforced at write (spec 5). */
export const MAX_OVERRIDES_BYTES = 8 * 1024;

// --- Blob geometry ---------------------------------------------------------

/** Half-hour slots in a day: 00:00 … 23:30. */
export const SLOTS_PER_DAY = 48;

/** Days in the recurring week. */
export const DAYS = 7;

/** Total slots in a recurring-week blob. */
export const WEEK_SLOTS = DAYS * SLOTS_PER_DAY; // 336
