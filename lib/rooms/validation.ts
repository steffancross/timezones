// Input validation for identity writes (spec 2). Pure — shared by createParticipant
// and updateIdentity. Throws InvalidInput on bad data so route handlers can map it
// to a 400; the message is safe to surface to the client.

export const MAX_NAME_LENGTH = 60;

/** A validation failure with a client-safe message. Handlers map this to HTTP 400. */
export class InvalidInput extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInput';
  }
}

/** Trim a display name and enforce non-empty + length cap. Returns the cleaned name. */
export function validateName(name: unknown): string {
  if (typeof name !== 'string') throw new InvalidInput('name is required');
  const trimmed = name.trim();
  if (!trimmed) throw new InvalidInput('name cannot be empty');
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new InvalidInput(`name cannot exceed ${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
}

/**
 * Is this a real IANA zone? We never trust the client's string. Constructing a
 * DateTimeFormat with a bad `timeZone` throws RangeError — the standard, cheap
 * validation trick (and it works in workerd).
 */
export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validate a timezone, throwing InvalidInput if it isn't a real IANA zone. Returns it. */
export function validateTimezone(tz: unknown): string {
  if (!isValidTimezone(tz)) throw new InvalidInput('invalid timezone');
  return tz;
}

/**
 * Validate an optional password field on a write. Returns a normalized value:
 *   - `undefined` → field omitted (leave password unchanged)
 *   - `null`      → explicitly clear the password
 *   - a string    → set it
 *
 * No length/complexity floor — the password is clobber-prevention for a low-stakes
 * obscure-link tool, not account security. Only an empty string is rejected (it's
 * ambiguous with "clear" — use `null` to clear).
 */
export function validatePasswordField(password: unknown): string | null | undefined {
  if (password === undefined) return undefined;
  if (password === null) return null;
  if (typeof password !== 'string') throw new InvalidInput('password must be a string');
  if (password.length === 0) throw new InvalidInput('password cannot be empty');
  return password;
}
