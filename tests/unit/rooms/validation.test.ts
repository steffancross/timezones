import { describe, expect, it } from 'vitest';
import {
  InvalidInput,
  isValidTimezone,
  validateName,
  validatePasswordField,
  validateTimezone,
} from '@/lib/rooms/validation';

describe('validateName', () => {
  it('trims and returns a clean name', () => {
    expect(validateName('  Maya  ')).toBe('Maya');
  });

  it('rejects empty / whitespace-only / non-string', () => {
    expect(() => validateName('')).toThrow(InvalidInput);
    expect(() => validateName('   ')).toThrow(InvalidInput);
    expect(() => validateName(undefined)).toThrow(InvalidInput);
    expect(() => validateName(42)).toThrow(InvalidInput);
  });

  it('rejects names over 60 chars', () => {
    expect(() => validateName('a'.repeat(61))).toThrow(InvalidInput);
    expect(validateName('a'.repeat(60))).toHaveLength(60);
  });
});

describe('isValidTimezone / validateTimezone', () => {
  it('accepts real IANA zones', () => {
    expect(isValidTimezone('America/Los_Angeles')).toBe(true);
    expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    expect(validateTimezone('Europe/Berlin')).toBe('Europe/Berlin');
  });

  it('rejects fake zones and non-strings', () => {
    expect(isValidTimezone('Not/AZone')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(123)).toBe(false);
    expect(() => validateTimezone('Mars/Olympus')).toThrow(InvalidInput);
  });
});

describe('validatePasswordField', () => {
  it('passes through undefined (leave) and null (clear)', () => {
    expect(validatePasswordField(undefined)).toBeUndefined();
    expect(validatePasswordField(null)).toBeNull();
  });

  it('accepts any non-empty password (no length floor — low-stakes clobber-prevention)', () => {
    expect(validatePasswordField('x')).toBe('x');
    expect(validatePasswordField('longenough')).toBe('longenough');
  });

  it('rejects empty string (use null to clear) and non-strings', () => {
    expect(() => validatePasswordField('')).toThrow(InvalidInput);
    expect(() => validatePasswordField(42)).toThrow(InvalidInput);
  });
});
