// Thin shared helpers for the room route handlers (spec 2). Keeps each handler a
// dumb wrapper over a pure op: guard content-type, read the client IP, and map
// the typed op errors to status codes in one place.

import {
  InvalidInput,
  ParticipantNotFoundError,
  RoomFullError,
  RoomNotFoundError,
} from './identity';

/**
 * Require `Content-Type: application/json` on state-changing requests. Forces a
 * CORS preflight for any cross-origin attempt — lightweight CSRF defense atop
 * the SameSite=Lax cookie. Returns a 415 Response to short-circuit, or null to proceed.
 */
export function requireJsonContentType(request: Request): Response | null {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return Response.json({ error: 'expected application/json' }, { status: 415 });
  }
  return null;
}

/** Parse a JSON body, returning {} on empty/invalid so handlers can validate fields uniformly. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The visitor's IP for rate-limiting. Cloudflare sets CF-Connecting-IP; fall back in dev/tests. */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
}

/** Whether this request is over HTTPS — drives the cookie `Secure` flag (off for http://localhost). */
export function isSecureRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return true; // unparseable URL: default to the safe (Secure) behavior
  }
}

/** Map a thrown identity-op error to an HTTP response. Rethrows the unexpected. */
export function mapWriteError(err: unknown): Response {
  if (err instanceof InvalidInput) {
    return Response.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof RoomNotFoundError || err instanceof ParticipantNotFoundError) {
    return Response.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof RoomFullError) {
    return Response.json({ error: err.message }, { status: 403 });
  }
  throw err;
}
