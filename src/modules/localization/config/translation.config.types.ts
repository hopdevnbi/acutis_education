import type { TranslationProviderId } from '../enums/translation-provider-id.enum';

export const TRANSLATION_CONFIGURATION_NAMESPACE = 'translation';

export const TRANSLATION_PROVIDER_VALUES = ['mock', 'google'] as const;
export type TranslationProviderSelection = (typeof TRANSLATION_PROVIDER_VALUES)[number];

export const DEFAULT_TRANSLATION_MAX_BATCH_UNITS = 200;
export const DEFAULT_TRANSLATION_MAX_BATCH_CHARS = 50_000;
export const DEFAULT_TRANSLATION_JOB_MAX_ATTEMPTS = 3;
export const DEFAULT_TRANSLATION_JOB_BATCH_SIZE = 10;
export const DEFAULT_TRANSLATION_MAX_UNIT_CHARS = 4_000;

export interface TranslationConfiguration {
  readonly selectedProvider: TranslationProviderId;
  readonly allowMockInProduction: boolean;
  readonly maxBatchUnits: number;
  readonly maxBatchChars: number;
  readonly maxUnitChars: number;
  readonly jobMaxAttempts: number;
  readonly jobDefaultBatchSize: number;
  readonly googleCloudProjectId: string | null;
  readonly googleCloudLocation: string | null;
  readonly googleApplicationCredentialsPath: string | null;
}

export interface ProviderGlossaryReference {
  readonly glossaryVersionId: string;
  readonly providerGlossaryId: string | null;
}
