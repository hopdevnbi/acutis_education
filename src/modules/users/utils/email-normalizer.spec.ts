import { isValidEmail, normalizeEmail } from './email-normalizer';

describe('email-normalizer', () => {
  it('trims and lowercases email addresses', () => {
    expect(normalizeEmail('  Teacher@Parish.Example  ')).toBe('teacher@parish.example');
  });

  it('accepts valid normalized email shapes', () => {
    expect(isValidEmail('teacher@parish.example')).toBe(true);
    expect(isValidEmail('  Teacher@Parish.Example  ')).toBe(true);
  });

  it('rejects clearly invalid email shapes', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing-domain@')).toBe(false);
  });
});
