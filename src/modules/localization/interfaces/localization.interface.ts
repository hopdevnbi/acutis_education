import type { TranslationResourceType } from '../enums/translation-resource-type.enum';
import type {
  DerivedTranslationReadStatus,
  TranslationRevisionStatus,
} from '../enums/translation-revision-status.enum';
import type { TranslationJobStatus } from '../enums/translation-job-status.enum';
import type { CatholicGlossaryVersionStatus } from '../enums/catholic-glossary-version-status.enum';
import type { LearnerTranslationReadStatus } from '../enums/learner-translation-read-status.enum';

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

export interface ResolveLocalizedResourceInput {
  readonly resourceType: TranslationResourceType;
  readonly resourceId: string;
  readonly targetLocale: string;
  readonly parishId: string | null;
  readonly requestedLocale?: string | null;
}

export interface ResolveLocalizedResourceWithRevisionInput {
  readonly resourceType: TranslationResourceType;
  readonly resourceId: string;
  readonly translationRevisionId: string;
  readonly parishId: string | null;
}

export interface LocalizedResourceResolution {
  readonly payload: Record<string, unknown>;
  readonly requestedLocale: string | null;
  readonly resolvedLocale: string;
  readonly sourceLocale: string;
  readonly translationStatus: LearnerTranslationReadStatus;
  readonly isFallback: boolean;
  readonly translationRevisionId: string | null;
  readonly sourceContentHash: string;
}

export interface LocalizedQuestionDisplayPayload {
  readonly prompt: string;
  readonly instruction: string | null;
  readonly explanation: string | null;
  readonly options: readonly {
    readonly id: string;
    readonly text: string | null;
  }[];
}

export interface TranslationJobSnapshot {
  readonly id: string;
  readonly translationResourceId: string;
  readonly targetLocale: string;
  readonly sourceContentHash: string;
  readonly sourceVersionKey: string | null;
  readonly status: TranslationJobStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly requestedByUserId: string | null;
  readonly providerId: string | null;
  readonly lastErrorCode: string | null;
  readonly lastErrorMessage: string | null;
  readonly nextAttemptAt: Date | null;
  readonly lockedAt: Date | null;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QueueTranslationJobInput {
  readonly translationResourceId: string;
  readonly targetLocale: string;
  readonly sourceContentHash: string;
  readonly sourceVersionKey?: string | null;
  readonly requestedByUserId?: string | null;
  readonly providerId?: string | null;
}

export type QueueTranslationJobResult =
  | { readonly kind: 'queued'; readonly job: TranslationJobSnapshot }
  | { readonly kind: 'existing_active'; readonly job: TranslationJobSnapshot }
  | { readonly kind: 'short_circuit_revision'; readonly revision: TranslationRevisionSnapshot };

export interface TranslationJobProcessingSummary {
  readonly claimedCount: number;
  readonly succeededCount: number;
  readonly failedCount: number;
  readonly deadCount: number;
}

export interface CatholicGlossaryVersionSnapshot {
  readonly id: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly versionNumber: number;
  readonly status: CatholicGlossaryVersionStatus;
  readonly providerGlossaryId: string | null;
  readonly createdByUserId: string | null;
  readonly publishedByUserId: string | null;
  readonly createdAt: Date;
  readonly publishedAt: Date | null;
  readonly updatedAt: Date;
}

export interface CatholicGlossaryTermSnapshot {
  readonly id: string;
  readonly glossaryVersionId: string;
  readonly sourceTerm: string;
  readonly targetTerm: string;
  readonly notes: string | null;
  readonly caseSensitive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
