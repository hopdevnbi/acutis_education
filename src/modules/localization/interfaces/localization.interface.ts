import type { TranslationResourceType } from '../enums/translation-resource-type.enum';
import type {
  DerivedTranslationReadStatus,
  TranslationRevisionStatus,
} from '../enums/translation-revision-status.enum';

export interface TranslationResourceRef {
  readonly resourceType: TranslationResourceType;
  readonly resourceId: string;
}

export interface TranslationResourceSnapshot {
  readonly id: string;
  readonly resourceType: TranslationResourceType;
  readonly resourceId: string;
  readonly parishId: string | null;
  readonly sourceLocale: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface GetOrCreateTranslationResourceInput {
  readonly resourceType: TranslationResourceType;
  readonly resourceId: string;
  readonly parishId: string | null;
  readonly sourceLocale: string;
}

export interface TranslationRevisionSnapshot {
  readonly id: string;
  readonly translationResourceId: string;
  readonly targetLocale: string;
  readonly revisionNumber: number;
  readonly sourceContentHash: string;
  readonly sourceVersionKey: string | null;
  readonly status: TranslationRevisionStatus;
  readonly payloadJson: string;
  readonly providerId: string | null;
  readonly providerModel: string | null;
  readonly glossaryVersionId: string | null;
  readonly createdByUserId: string | null;
  readonly approvedByUserId: string | null;
  readonly createdAt: Date;
  readonly approvedAt: Date | null;
}

export interface CreateTranslationRevisionInput {
  readonly translationResourceId: string;
  readonly targetLocale: string;
  readonly sourceContentHash: string;
  readonly sourceVersionKey?: string | null;
  readonly status: TranslationRevisionStatus;
  readonly payload: Record<string, unknown>;
  readonly providerId?: string | null;
  readonly providerModel?: string | null;
  readonly glossaryVersionId?: string | null;
  readonly createdByUserId?: string | null;
  readonly approvedByUserId?: string | null;
  readonly approvedAt?: Date | null;
}

export interface LatestApprovedTranslationRevisionResult {
  readonly revision: TranslationRevisionSnapshot | null;
  readonly derivedStatus: DerivedTranslationReadStatus;
  readonly isStale: boolean;
}

export interface LocaleResolutionInput {
  readonly explicitLocale?: string | null;
  readonly userPreferredLocale?: string | null;
  readonly acceptLanguageHeader?: string | null;
  readonly parishDefaultLocale?: string | null;
}

export interface LocaleResolutionResult {
  readonly requestedLocale: string | null;
  readonly resolvedLocale: string;
  readonly resolutionSource:
    'explicit' | 'user_preference' | 'accept_language' | 'parish_default' | 'system_default';
}
