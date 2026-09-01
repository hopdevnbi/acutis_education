import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CatholicGlossaryTermEntity } from '../entities/catholic-glossary-term.entity';
import { CatholicGlossaryVersionEntity } from '../entities/catholic-glossary-version.entity';
import { TranslationJobEntity } from '../entities/translation-job.entity';
import { TranslationResourceEntity } from '../entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../entities/translation-revision.entity';
import type {
  CatholicGlossaryTermSnapshot,
  CatholicGlossaryVersionSnapshot,
  TranslationJobSnapshot,
  TranslationResourceSnapshot,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';

export function toTranslationResourceSnapshot(
  entity: TranslationResourceEntity,
): TranslationResourceSnapshot {
  return {
    id: normalizeUuid(entity.id),
    resourceType: entity.resourceType,
    resourceId: normalizeUuid(entity.resourceId),
    parishId: entity.parishId === null ? null : normalizeUuid(entity.parishId),
    sourceLocale: entity.sourceLocale,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toTranslationRevisionSnapshot(
  entity: TranslationRevisionEntity,
): TranslationRevisionSnapshot {
  return {
    id: normalizeUuid(entity.id),
    translationResourceId: normalizeUuid(entity.translationResourceId),
    targetLocale: entity.targetLocale,
    revisionNumber: entity.revisionNumber,
    sourceContentHash: entity.sourceContentHash,
    sourceVersionKey: entity.sourceVersionKey,
    status: entity.status,
    payloadJson: entity.payloadJson,
    providerId: entity.providerId,
    providerModel: entity.providerModel,
    glossaryVersionId:
      entity.glossaryVersionId === null ? null : normalizeUuid(entity.glossaryVersionId),
    createdByUserId: entity.createdByUserId === null ? null : normalizeUuid(entity.createdByUserId),
    approvedByUserId:
      entity.approvedByUserId === null ? null : normalizeUuid(entity.approvedByUserId),
    createdAt: entity.createdAt,
    approvedAt: entity.approvedAt,
  };
}

export function toTranslationJobSnapshot(entity: TranslationJobEntity): TranslationJobSnapshot {
  return {
    id: normalizeUuid(entity.id),
    translationResourceId: normalizeUuid(entity.translationResourceId),
    targetLocale: entity.targetLocale,
    sourceContentHash: entity.sourceContentHash,
    sourceVersionKey: entity.sourceVersionKey,
    status: entity.status,
    attemptCount: entity.attemptCount,
    maxAttempts: entity.maxAttempts,
    requestedByUserId:
      entity.requestedByUserId === null ? null : normalizeUuid(entity.requestedByUserId),
    providerId: entity.providerId,
    lastErrorCode: entity.lastErrorCode,
    lastErrorMessage: entity.lastErrorMessage,
    nextAttemptAt: entity.nextAttemptAt,
    lockedAt: entity.lockedAt,
    startedAt: entity.startedAt,
    completedAt: entity.completedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toCatholicGlossaryVersionSnapshot(
  entity: CatholicGlossaryVersionEntity,
): CatholicGlossaryVersionSnapshot {
  return {
    id: normalizeUuid(entity.id),
    sourceLocale: entity.sourceLocale,
    targetLocale: entity.targetLocale,
    versionNumber: entity.versionNumber,
    status: entity.status,
    providerGlossaryId: entity.providerGlossaryId,
    createdByUserId: entity.createdByUserId === null ? null : normalizeUuid(entity.createdByUserId),
    publishedByUserId:
      entity.publishedByUserId === null ? null : normalizeUuid(entity.publishedByUserId),
    createdAt: entity.createdAt,
    publishedAt: entity.publishedAt,
    updatedAt: entity.updatedAt,
  };
}

export function toCatholicGlossaryTermSnapshot(
  entity: CatholicGlossaryTermEntity,
): CatholicGlossaryTermSnapshot {
  return {
    id: normalizeUuid(entity.id),
    glossaryVersionId: normalizeUuid(entity.glossaryVersionId),
    sourceTerm: entity.sourceTerm,
    targetTerm: entity.targetTerm,
    notes: entity.notes,
    caseSensitive: entity.caseSensitive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
