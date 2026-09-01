import { InvalidTranslationPayloadError } from '../errors/localization.errors';

export function parseTranslationPayloadJson(payloadJson: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payloadJson) as unknown;
  } catch {
    throw new InvalidTranslationPayloadError('Translation payload must be valid JSON.');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidTranslationPayloadError('Translation payload must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}
