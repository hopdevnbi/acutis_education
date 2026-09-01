import { InvalidLocaleError } from './locale.errors';
import { normalizeLocale, parseLocale } from './parse-locale.util';

describe('parse-locale.util', () => {
  it('normalizes BCP 47-like locales', () => {
    expect(parseLocale(' vi-vn ')).toBe('vi-VN');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('fr-FR')).toBe('fr-FR');
  });

  it('rejects invalid locales', () => {
    expect(() => parseLocale('')).toThrow(InvalidLocaleError);
    expect(() => parseLocale('123')).toThrow(InvalidLocaleError);
  });

  it('rejects overlong locales', () => {
    expect(() => normalizeLocale('a'.repeat(33))).toThrow(InvalidLocaleError);
  });
});
