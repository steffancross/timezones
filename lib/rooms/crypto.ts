// Identity crypto for the Availability Room (spec 2). Web Crypto only — no deps,
// and pure (no D1 / OpenNext), so these are unit-tested in browser mode exactly
// like admin-auth.ts. Two distinct jobs:
//
//   - The cookie SECRET is 256 bits of `getRandomValues` randomness. High
//     entropy means a single fast hash (SHA-256) is enough to store it — there's
//     nothing to brute-force. See sha256Base64url / generateSecret.
//   - A PASSWORD is low-entropy and human-chosen, so it gets PBKDF2 (100k
//     iterations, per-participant salt) to make guessing expensive. See
//     hashPassword / verifyPassword.

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BITS = 256;

// --- base64url helpers -----------------------------------------------------

/** Encode raw bytes as base64url without padding (URL- and cookie-safe). */
function bytesToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a base64url (no padding) string back to bytes. */
function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- the cookie secret -----------------------------------------------------

/**
 * A fresh per-room cookie secret: 32 random bytes (256 bits) as base64url (43
 * chars, no padding). Unlike the room id we keep every byte — there's no fixed
 * alphabet to sample into, we just want maximum entropy in a cookie-safe string.
 */
export function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64url(bytes);
}

/**
 * SHA-256 of the secret, base64url-encoded — what we store in `secret_hash` and
 * look the participant up by. A single hash is sufficient for a 256-bit random
 * value (PBKDF2 is only for low-entropy passwords).
 */
export async function sha256Base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bytesToBase64url(new Uint8Array(digest));
}

// --- passwords (PBKDF2) ----------------------------------------------------

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    PBKDF2_HASH_BITS,
  );
  return new Uint8Array(bits);
}

/**
 * Hash a password for storage as `pbkdf2$<iters>$<salt_b64url>$<hash_b64url>`.
 * Per-participant random salt; iteration count baked into the string so we can
 * raise it later without breaking existing hashes.
 */
export async function hashPassword(
  password: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const salt = new Uint8Array(PBKDF2_SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await deriveBits(password, salt, iterations);
  return `pbkdf2$${iterations}$${bytesToBase64url(salt)}$${bytesToBase64url(hash)}`;
}

/** Constant-time equality over raw bytes (the admin-auth XOR pattern, no re-digest). */
function bytesEqualConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * Verify a candidate password against a stored `pbkdf2$...` string. Re-derives
 * with the stored salt + iterations and constant-time compares the derived
 * bytes. Returns false (never throws) on any malformed/empty input so callers
 * can treat it as a plain auth failure.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!password || !stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  let expected: Uint8Array;
  let actual: Uint8Array;
  try {
    const salt = base64urlToBytes(parts[2] ?? '');
    expected = base64urlToBytes(parts[3] ?? '');
    actual = await deriveBits(password, salt, iterations);
  } catch {
    return false;
  }
  return bytesEqualConstantTime(actual, expected);
}
