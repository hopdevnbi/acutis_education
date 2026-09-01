import type { TranslatableUnit } from '../providers/translation-provider.interface';
import { TranslationProviderError } from '../providers/errors/translation-provider.errors';

export function assertTranslationBatchGuardrails(input: {
  readonly units: readonly TranslatableUnit[];
  readonly maxBatchUnits: number;
  readonly maxBatchChars: number;
  readonly maxUnitChars: number;
}): void {
  if (input.units.length === 0) {
    throw new TranslationProviderError('INVALID_REQUEST', 'Translation batch must include units.');
  }

  if (input.units.length > input.maxBatchUnits) {
    throw new TranslationProviderError(
      'INVALID_REQUEST',
      'Translation batch exceeds the maximum unit count.',
    );
  }

  let totalChars = 0;

  for (const unit of input.units) {
    if (unit.text.length > input.maxUnitChars) {
      throw new TranslationProviderError(
        'INVALID_REQUEST',
        'Translation unit exceeds the maximum unit size.',
      );
    }

    totalChars += unit.text.length;
  }

  if (totalChars > input.maxBatchChars) {
    throw new TranslationProviderError(
      'INVALID_REQUEST',
      'Translation batch exceeds the maximum total character count.',
    );
  }
}
