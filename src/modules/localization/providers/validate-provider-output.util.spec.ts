import type { TranslatableUnit, TranslatedUnit } from './translation-provider.interface';
import { validateProviderOutput } from './validate-provider-output.util';
import { TranslationProviderError } from './errors/translation-provider.errors';

describe('validateProviderOutput', () => {
  const inputUnits: TranslatableUnit[] = [
    { id: 'a', text: 'one' },
    { id: 'b', text: 'two' },
  ];

  it('accepts output preserving every input id once', () => {
    const outputUnits: TranslatedUnit[] = [
      { id: 'a', text: 'uno' },
      { id: 'b', text: 'dos' },
    ];

    expect(validateProviderOutput(inputUnits, outputUnits, 100)).toEqual(outputUnits);
  });

  it('rejects duplicate or missing ids', () => {
    expect(() => validateProviderOutput(inputUnits, [{ id: 'a', text: 'uno' }], 100)).toThrow(
      TranslationProviderError,
    );
  });
});
