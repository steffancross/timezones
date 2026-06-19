// Client-side fetch wrappers for the room identity endpoints (spec 2). The app
// has no shared fetch layer (it's mostly SSR), so these are small and explicit.
// Same-origin requests send the path-scoped ar_secret cookie automatically; the
// JSON content-type satisfies each handler's CSRF guard.

import type { PublicParticipant } from './db';
import type { ClaimableParticipant } from './identity';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>(url, 'POST', body);
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>(url, 'PATCH', body);
}

async function sendJson<T>(url: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || `request failed (${res.status})`);
  return data;
}

const base = (roomId: string) => `/r/${encodeURIComponent(roomId)}`;

// The one non-room-scoped call: create a fresh room and get its id back. v1
// creates unnamed; rename happens later via settings.
export function createRoomRequest(name?: string): Promise<{ id: string }> {
  return postJson('/api/rooms', name ? { name } : {});
}

export type ContributeInput = { name: string; timezone: string; password?: string };

export function createParticipantRequest(
  roomId: string,
  input: ContributeInput,
): Promise<{ participant: PublicParticipant; you: { participantId: string } }> {
  return postJson(`${base(roomId)}/participants`, input);
}

export function updateIdentityRequest(
  roomId: string,
  patch: { name?: string; timezone?: string; password?: string | null },
): Promise<{ participant: PublicParticipant }> {
  return patchJson(`${base(roomId)}/me`, patch);
}

export function renameRoomRequest(
  roomId: string,
  name: string,
): Promise<{ room: { id: string; name: string } }> {
  return patchJson(`${base(roomId)}/room`, { name });
}

export async function listClaimableRequest(roomId: string): Promise<ClaimableParticipant[]> {
  const res = await fetch(`${base(roomId)}/claimable`);
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  const data = (await res.json()) as { claimable: ClaimableParticipant[] };
  return data.claimable;
}

export function claimRequest(
  roomId: string,
  input: { participantId: string; password?: string },
): Promise<{ you: { participantId: string } }> {
  return postJson(`${base(roomId)}/claim`, input);
}

export type AvailabilityPatchInput = {
  generalWeek?: string;
  overrides?: { set?: Record<string, string>; clear?: string[] };
};

export function writeAvailabilityRequest(
  roomId: string,
  patch: AvailabilityPatchInput,
): Promise<{ participant: PublicParticipant }> {
  return patchJson(`${base(roomId)}/me/availability`, patch);
}
