// Room id generation (spec 1). The link's obscurity IS the access control, so
// the id must be unguessable: high-entropy, URL-safe, non-sequential, and it
// must not encode time or insertion order. Web Crypto only — no deps.

import { ROOM_ID_LENGTH } from './config';

// URL-safe alphabet (RFC 4648 base64url chars, sans padding): A–Z a–z 0–9 _ -
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * A length-21 id over the 64-char URL-safe alphabet ≈ 125 bits of entropy.
 * We map random bytes to the alphabet by masking to 6 bits (0..63), which is a
 * perfect fit for a 64-char alphabet — no modulo bias.
 */
export function generateRoomId(): string {
  const bytes = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) {
    // 64-char alphabet → the low 6 bits of each random byte (uniform). charAt
    // always returns a string, so the index is total without an assertion.
    id += ALPHABET.charAt(byte & 63);
  }
  return id;
}
