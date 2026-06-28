import { describe, expect, it } from 'vitest';
import { buildSecretCookie, clearSecretCookie, readSecretCookie } from '@/lib/rooms/cookies';

describe('buildSecretCookie', () => {
  it('sets the per-room path and all security attributes by default', () => {
    const cookie = buildSecretCookie('Room123', 'the-secret');
    expect(cookie).toContain('ar_secret=the-secret');
    expect(cookie).toContain('Path=/r/Room123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=31536000');
    expect(cookie).toContain('Secure');
  });

  it('drops Secure for plain-http (localhost dev)', () => {
    const cookie = buildSecretCookie('Room123', 'the-secret', { secure: false });
    expect(cookie).not.toContain('Secure');
    // ...but still HttpOnly + path-scoped.
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/r/Room123');
  });
});

describe('clearSecretCookie', () => {
  it('expires the cookie (Max-Age=0) on the same path', () => {
    const cookie = clearSecretCookie('Room123');
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('Path=/r/Room123');
  });
});

describe('readSecretCookie', () => {
  it('extracts ar_secret from among other cookies', () => {
    expect(readSecretCookie('foo=bar; ar_secret=xyz123; baz=1')).toBe('xyz123');
    expect(readSecretCookie('ar_secret=onlyone')).toBe('onlyone');
  });

  it('returns null when absent, empty, or no header', () => {
    expect(readSecretCookie('foo=bar; baz=1')).toBeNull();
    expect(readSecretCookie('ar_secret=')).toBeNull();
    expect(readSecretCookie(null)).toBeNull();
    expect(readSecretCookie('')).toBeNull();
  });
});
