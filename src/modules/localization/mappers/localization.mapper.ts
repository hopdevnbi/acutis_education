import { normalizeUuid } from '../../../database/uuid-v4.util';
import { TranslationResourceEntity } from '../entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../entities/translation-revision.entity';
import type {
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
