export enum TranslationProviderId {
  Mock = 'mock',
  Google = 'google',
}

const TRANSLATION_PROVIDER_IDS = new Set<string>(Object.values(TranslationProviderId));

export function isTranslationProviderId(value: string): value is TranslationProviderId {
  return TRANSLATION_PROVIDER_IDS.has(value);
}
