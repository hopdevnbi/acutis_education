import type { TranslatableUnit, TranslatedUnit } from './translation-provider.interface';
import { TranslationProviderError } from './errors/translation-provider.errors';
export function validateProviderOutput(
  inputUnits: readonly TranslatableUnit[],
  outputUnits: readonly TranslatedUnit[],
  maxUnitChars: number,
): TranslatedUnit[] {
  if (outputUnits.length !== inputUnits.length) {
    throw new TranslationProviderError(
      'PROVIDER_OUTPUT_INVALID',
      'Provider output count does not match input count.',
    );
  }

  const inputIds = new Set(inputUnits.map((unit) => unit.id));
  const seenOutputIds = new Set<string>();
  const normalizedOutput: TranslatedUnit[] = [];

  for (const outputUnit of outputUnits) {
    if (!inputIds.has(outputUnit.id)) {
      throw new TranslationProviderError(
        'PROVIDER_OUTPUT_INVALID',
        'Provider output contains an unknown unit id.',
      );
    }

    if (seenOutputIds.has(outputUnit.id)) {
      throw new TranslationProviderError(
        'PROVIDER_OUTPUT_INVALID',
        'Provider output contains duplicate unit ids.',
      );
    }

    seenOutputIds.add(outputUnit.id);

    const text = outputUnit.text;

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new TranslationProviderError(
        'PROVIDER_OUTPUT_INVALID',
        'Provider output contains invalid text.',
      );
    }

    if (text.length > maxUnitChars) {
      throw new TranslationProviderError(
        'PROVIDER_OUTPUT_INVALID',
        'Provider output text exceeds the maximum unit size.',
      );
    }

    normalizedOutput.push({ id: outputUnit.id, text });
  }

  for (const inputId of inputIds) {
    if (!seenOutputIds.has(inputId)) {
      throw new TranslationProviderError(
        'PROVIDER_OUTPUT_INVALID',
        'Provider output is missing a required unit id.',
      );
    }
  }

  return normalizedOutput;
}
