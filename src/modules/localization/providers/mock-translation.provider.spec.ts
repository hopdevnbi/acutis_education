import { MockTranslationProvider } from './mock-translation.provider';

describe('MockTranslationProvider', () => {
  const provider = new MockTranslationProvider();

  it('returns deterministic translated units preserving ids', async () => {
    const first = await provider.translateBatch({
      units: [
        { id: 'unit-1', text: 'Xin chào' },
        { id: 'unit-2', text: 'Bài học' },
      ],
      sourceLocale: 'vi-VN',
      targetLocale: 'en-US',
    });
    const second = await provider.translateBatch({
      units: [
        { id: 'unit-1', text: 'Xin chào' },
        { id: 'unit-2', text: 'Bài học' },
      ],
      sourceLocale: 'vi-VN',
      targetLocale: 'en-US',
    });

    expect(first).toEqual(second);
    expect(first.map((unit) => unit.id)).toEqual(['unit-1', 'unit-2']);
    expect(first[0]?.text).toContain('[vi-vn->en-us]');
  });

  it('applies registered glossary terms', async () => {
    provider.registerGlossaryTerms('glossary-1', [
      { sourceTerm: 'Thánh', targetTerm: 'Saint', caseSensitive: false },
    ]);

    const translated = await provider.translateBatch({
      units: [{ id: 'unit-1', text: 'Nhà thờ Thánh' }],
      sourceLocale: 'vi-VN',
      targetLocale: 'en-US',
      glossary: { glossaryVersionId: 'glossary-1', providerGlossaryId: null },
    });

    expect(translated[0]?.text).toContain('Saint');
  });
});
