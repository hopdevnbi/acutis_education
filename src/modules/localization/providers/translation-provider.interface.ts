import type { TranslationProviderId } from '../enums/translation-provider-id.enum';
import type { ProviderGlossaryReference } from '../config/translation.config.types';

export interface TranslatableUnit {
  readonly id: string;
  readonly text: string;
  readonly context?: string | null;
  readonly unitType?: string | null;
}

export interface TranslatedUnit {
  readonly id: string;
  readonly text: string;
}

export interface TranslationBatchInput {
  readonly units: readonly TranslatableUnit[];
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly glossary?: ProviderGlossaryReference | null;
  readonly context?: string | null;
}

export interface TranslationProvider {
  readonly providerId: TranslationProviderId;
  translateBatch(input: TranslationBatchInput): Promise<TranslatedUnit[]>;
}
