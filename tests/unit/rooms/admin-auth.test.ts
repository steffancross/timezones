import { describe, expect, it } from 'vitest';
import { extractBearerToken, secretsMatch } from '@/lib/rooms/admin-auth';

describe('extractBearerToken', () => {
  it('pulls the token from a Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('returns empty for absent or malformed headers', () => {
    expect(extractBearerToken(null)).toBe('');
    expect(extractBearerToken('')).toBe('');
    expect(extractBearerToken('abc123')).toBe('');
    expect(extractBearerToken('Basic abc123')).toBe('');
  });
});

describe('secretsMatch', () => {
  it('matches identical non-empty secrets', async () => {
    expect(await secretsMatch('s3cr3t-token', 's3cr3t-token')).toBe(true);
  });

  it('rejects different secrets', async () => {
    expect(await secretsMatch('s3cr3t-token', 's3cr3t-toked')).toBe(false);
    expect(await secretsMatch('short', 'a-much-longer-secret')).toBe(false);
  });

  it('never matches when either side is empty (unset secret / missing header)', async () => {
    expect(await secretsMatch('', '')).toBe(false);
    expect(await secretsMatch('something', '')).toBe(false);
    expect(await secretsMatch('', 'something')).toBe(false);
  });
});
