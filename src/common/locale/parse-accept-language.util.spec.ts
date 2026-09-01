import { parseAcceptLanguageHeader } from './parse-accept-language.util';

describe('parse-accept-language.util', () => {
  it('returns empty for missing header', () => {
    expect(parseAcceptLanguageHeader(null)).toEqual([]);
    expect(parseAcceptLanguageHeader('   ')).toEqual([]);
  });

  it('sorts by q descending then original order', () => {
    expect(parseAcceptLanguageHeader('fr-FR, en-US;q=0.9, vi-VN;q=0.8')).toEqual([
      { locale: 'fr-FR', quality: 1, originalIndex: 0 },
      { locale: 'en-US', quality: 0.9, originalIndex: 1 },
      { locale: 'vi-VN', quality: 0.8, originalIndex: 2 },
    ]);
  });

  it('ignores malformed tags, q=0, and wildcard', () => {
    expect(parseAcceptLanguageHeader('*, invalid123, en;q=0, en-US')).toEqual([
      { locale: 'en-US', quality: 1, originalIndex: 3 },
    ]);
  });

  it('bounds the number of parsed entries', () => {
    const locales = ['en', 'fr', 'vi', 'de', 'es'];
    const header = Array.from({ length: 40 }, (_, index) => locales[index % locales.length]).join(
      ', ',
    );
    expect(parseAcceptLanguageHeader(header)).toHaveLength(32);
  });

  it('ignores malformed q values', () => {
    expect(parseAcceptLanguageHeader('en-US;q=abc, fr-FR')).toEqual([
      { locale: 'fr-FR', quality: 1, originalIndex: 1 },
    ]);
  });
});
