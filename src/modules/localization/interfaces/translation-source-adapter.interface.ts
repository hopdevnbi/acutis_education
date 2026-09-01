import type { TranslationResourceType } from '../enums/translation-resource-type.enum';
import type { TranslatableUnit, TranslatedUnit } from '../providers/translation-provider.interface';

export interface TranslationSourceSnapshot {
  readonly resourceType: TranslationResourceType;
  readonly resourceId: string;
  readonly sourceLocale: string;
  readonly sourceContentHash: string;
  readonly sourceVersionKey: string | null;
  readonly payload: Record<string, unknown>;
}

export interface TranslationSourceAdapter {
  readonly resourceType: TranslationResourceType;
  resolveSource(resourceId: string): Promise<TranslationSourceSnapshot | null>;
  extractTranslatableUnits(snapshot: TranslationSourceSnapshot): TranslatableUnit[];
  buildPayload(
    snapshot: TranslationSourceSnapshot,
    translatedUnits: readonly TranslatedUnit[],
  ): Record<string, unknown>;
}
