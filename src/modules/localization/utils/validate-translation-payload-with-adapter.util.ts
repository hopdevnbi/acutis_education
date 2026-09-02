import type { TranslationSourceAdapter } from '../interfaces/translation-source-adapter.interface';
import type { TranslationSourceSnapshot } from '../interfaces/translation-source-adapter.interface';
import { LocalizationInvalidPayloadError } from '../errors/localization-admin.errors';

export function validateTranslationPayloadWithAdapter(
  adapter: TranslationSourceAdapter,
  sourceSnapshot: TranslationSourceSnapshot,
  payload: Record<string, unknown>,
): void {
  try {
    adapter.applyTranslation(sourceSnapshot, payload);
  } catch {
    throw new LocalizationInvalidPayloadError();
  }
}
