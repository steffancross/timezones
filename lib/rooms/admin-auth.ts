// Auth helpers for the admin janitor endpoint, factored out so they're testable
// without the Next runtime (the route handler is then a thin wrapper).

/** Pull the token from an `Authorization: Bearer <token>` header. Returns '' if absent/malformed. */
export function extractBearerToken(header: string | null): string {
  if (!header) return '';
  const prefix = 'Bearer ';
  return header.startsWith(prefix) ? header.slice(prefix.length) : '';
}

/**
 * Constant-time string equality via fixed-length SHA-256 digests, so neither
 * the content nor the length of the secret leaks through timing. Empty inputs
 * never match (guards against an unset secret or a missing header).
 */
export async function secretsMatch(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= (va[i] ?? 0) ^ (vb[i] ?? 0);
  return diff === 0;
}
