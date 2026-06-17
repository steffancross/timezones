import { describe, expect, it } from 'vitest';
import { generateSecret, hashPassword, sha256Base64url, verifyPassword } from '@/lib/rooms/crypto';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe('generateSecret', () => {
  it('is 43 base64url chars (32 random bytes, no padding) and unique per call', () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).toHaveLength(43);
    expect(a).toMatch(BASE64URL);
    expect(a).not.toBe(b);
  });
});

describe('sha256Base64url', () => {
  it('is deterministic, url-safe, and not the input itself', async () => {
    const secret = 'a-known-secret-value';
    const h1 = await sha256Base64url(secret);
    const h2 = await sha256Base64url(secret);
    expect(h1).toBe(h2);
    expect(h1).toMatch(BASE64URL);
    expect(h1).toHaveLength(43); // 32-byte digest → 43 base64url chars
    expect(h1).not.toBe(secret);
  });

  it('differs for different inputs', async () => {
    expect(await sha256Base64url('one')).not.toBe(await sha256Base64url('two'));
  });
});

describe('hashPassword / verifyPassword', () => {
  it('stores as pbkdf2$<iters>$<salt>$<hash> and never contains the plaintext', async () => {
    const stored = await hashPassword('hunter2hunter2');
    const parts = stored.split('$');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('pbkdf2');
    expect(parts[1]).toBe('100000');
    expect(parts[2]).toMatch(BASE64URL);
    expect(parts[3]).toMatch(BASE64URL);
    expect(stored).not.toContain('hunter2hunter2');
  });

  it('uses a fresh salt each time, so the same password hashes differently', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct-horse');
    expect(await verifyPassword('correct-horse', stored)).toBe(true);
    expect(await verifyPassword('wrong-horse', stored)).toBe(false);
  });

  it('honours a non-default iteration count baked into the stored string', async () => {
    const stored = await hashPassword('password123', 1000);
    expect(stored.split('$')[1]).toBe('1000');
    expect(await verifyPassword('password123', stored)).toBe(true);
  });

  it('returns false (never throws) on malformed or empty input', async () => {
    expect(await verifyPassword('x', 'not-a-valid-stored-hash')).toBe(false);
    expect(await verifyPassword('x', 'pbkdf2$abc$salt$hash')).toBe(false);
    expect(await verifyPassword('', await hashPassword('something8'))).toBe(false);
    expect(await verifyPassword('something8', '')).toBe(false);
  });
});
