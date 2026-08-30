import { parseSourceLocale } from './curriculum-source-locale.util';
import { InvalidCurriculumSourceLocaleError } from '../errors/curriculum.errors';

describe('curriculum-source-locale.util', () => {
  it('normalizes BCP 47-like locales', () => {
    expect(parseSourceLocale(' vi-vn ')).toBe('vi-VN');
    expect(parseSourceLocale('en')).toBe('en');
    expect(parseSourceLocale('fr-FR')).toBe('fr-FR');
  });

  it('rejects invalid locales', () => {
    expect(() => parseSourceLocale('')).toThrow(InvalidCurriculumSourceLocaleError);
    expect(() => parseSourceLocale('123')).toThrow(InvalidCurriculumSourceLocaleError);
  });
});
