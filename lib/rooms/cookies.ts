// Per-room identity cookie (spec 2). Pure string helpers (no env, no
// `next/headers`) so route handlers stay thin and these are unit-testable.
//
// The cookie is PATH-SCOPED: `Path=/r/{roomId}`. The browser only returns it for
// that room's URL tree, so two rooms open in one browser never clash — each
// request carries only its own room's secret. (Room ids are fixed-length 21 and
// distinct, so one room's path is never a prefix of another's.) That's why the
// cookie NAME can be a fixed constant: the Path does the isolation.
//
// All the room's JSON endpoints therefore live UNDER /r/{roomId}/ (e.g.
// /r/{roomId}/state) — a cookie scoped to /r/{roomId} would NOT be sent to
// /api/... — so they all receive the secret.
//
// `Secure` defaults on (the prod case). The handler passes `{ secure: false }`
// for plain-http localhost dev (derived from the request URL), so we never read
// env here.

const COOKIE_NAME = 'ar_secret';
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // ~1 year — same-device persistence

type CookieOpts = { secure?: boolean };

function cookiePath(roomId: string): string {
  return `/r/${roomId}`;
}

function attributes(roomId: string, maxAge: number, secure: boolean): string {
  const attrs = [`Path=${cookiePath(roomId)}`, 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

/** Build the Set-Cookie header value that binds this device to a room secret. */
export function buildSecretCookie(roomId: string, secret: string, opts: CookieOpts = {}): string {
  const secure = opts.secure ?? true;
  return `${COOKIE_NAME}=${secret}; ${attributes(roomId, MAX_AGE_SECONDS, secure)}`;
}

/** Build a Set-Cookie that clears this room's secret (Max-Age=0). */
export function clearSecretCookie(roomId: string, opts: CookieOpts = {}): string {
  const secure = opts.secure ?? true;
  return `${COOKIE_NAME}=; ${attributes(roomId, 0, secure)}`;
}

/** Pull `ar_secret` out of a request Cookie header. Returns null if absent. */
export function readSecretCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    if (name === COOKIE_NAME) {
      const value = pair.slice(eq + 1).trim();
      return value || null;
    }
  }
  return null;
}
