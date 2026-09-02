import type {
  BulkTranslationResult,
  RequestTranslationResult,
  TranslationJobListResult,
  TranslationJobSnapshot,
  TranslationResourceDetail,
  TranslationResourceListItem,
  TranslationResourceListResult,
  TranslationResourceSnapshot,
  TranslationRevisionDetail,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import type { LocalizedResourceResolution } from '../interfaces/localization.interface';
import type {
  BulkTranslationResponseDto,
  LocalizationPreviewResponseDto,
  RequestTranslationResponseDto,
  TranslationJobListResponseDto,
  TranslationJobSummaryResponseDto,
  TranslationResourceDetailResponseDto,
  TranslationResourceListResponseDto,
  TranslationResourceSummaryResponseDto,
  TranslationRevisionDetailResponseDto,
  TranslationRevisionSummaryResponseDto,
} from '../dto/localization-admin-response.dto';
import { AdminTranslationEffectiveStatus } from '../enums/admin-translation-effective-status.enum';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';

function toIsoString(value: Date): string {
  return value.toISOString();
}

export function toTranslationResourceSummaryResponse(
  item: TranslationResourceListItem | TranslationResourceSnapshot,
): TranslationResourceSummaryResponseDto {
  return {
    id: item.id,
    resourceType: item.resourceType as TranslationResourceType,
    resourceId: item.resourceId,
    parishId: item.parishId,
    sourceLocale: item.sourceLocale,
    targetLocale: 'targetLocale' in item ? item.targetLocale : null,
    effectiveStatus:
      'effectiveStatus' in item && item.effectiveStatus !== null
        ? (item.effectiveStatus as AdminTranslationEffectiveStatus)
        : null,
    currentSourceContentHash:
      'currentSourceContentHash' in item ? item.currentSourceContentHash : null,
    latestRevisionId: 'latestRevisionId' in item ? item.latestRevisionId : null,
    latestRevisionStatus:
      'latestRevisionStatus' in item
        ? (item.latestRevisionStatus as TranslationRevisionStatus | null)
        : null,
    latestRevisionNumber: 'latestRevisionNumber' in item ? item.latestRevisionNumber : null,
    createdAt: toIsoString(item.createdAt),
    updatedAt: toIsoString(item.updatedAt),
  };
}

export function toTranslationRevisionSummaryResponse(
  revision: TranslationRevisionSnapshot,
): TranslationRevisionSummaryResponseDto {
  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    status: revision.status,
    targetLocale: revision.targetLocale,
    sourceContentHash: revision.sourceContentHash,
    sourceVersionKey: revision.sourceVersionKey,
    approvedByUserId: revision.approvedByUserId,
    approvedAt: revision.approvedAt === null ? null : toIsoString(revision.approvedAt),
    createdAt: toIsoString(revision.createdAt),
  };
}

export function toTranslationJobSummaryResponse(
  job: TranslationJobSnapshot,
): TranslationJobSummaryResponseDto {
  return {
    id: job.id,
    translationResourceId: job.translationResourceId,
    targetLocale: job.targetLocale,
    sourceContentHash: job.sourceContentHash,
    status: job.status,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    lastErrorCode: job.lastErrorCode,
    lastErrorMessage: job.lastErrorMessage,
    createdAt: toIsoString(job.createdAt),
    updatedAt: toIsoString(job.updatedAt),
  };
}

export function toTranslationResourceListResponse(
  result: TranslationResourceListResult,
): TranslationResourceListResponseDto {
  return {
    items: result.items.map((item) => toTranslationResourceSummaryResponse(item)),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

export function toTranslationResourceDetailResponse(
  detail: TranslationResourceDetail,
): TranslationResourceDetailResponseDto {
  return {
    resource: toTranslationResourceSummaryResponse(detail.resource),
    targetLocale: detail.targetLocale,
    effectiveStatus:
      detail.effectiveStatus === null
        ? null
        : (detail.effectiveStatus as AdminTranslationEffectiveStatus),
    currentSourceContentHash: detail.currentSourceContentHash,
    currentSourceVersionKey: detail.currentSourceVersionKey,
    latestRevision:
      detail.latestRevision === null
        ? null
        : toTranslationRevisionSummaryResponse(detail.latestRevision),
    latestJob: detail.latestJob === null ? null : toTranslationJobSummaryResponse(detail.latestJob),
  };
}

export function toTranslationRevisionDetailResponse(
  detail: TranslationRevisionDetail,
): TranslationRevisionDetailResponseDto {
  return {
    revision: toTranslationRevisionSummaryResponse(detail.revision),
    resource: toTranslationResourceSummaryResponse(detail.resource),
    payload: detail.payload,
    effectiveStatus: detail.effectiveStatus as AdminTranslationEffectiveStatus,
    isStale: detail.isStale,
    currentSourceContentHash: detail.currentSourceContentHash,
  };
}

export function toTranslationJobListResponse(
  result: TranslationJobListResult,
): TranslationJobListResponseDto {
  return {
    items: result.items.map((item) => toTranslationJobSummaryResponse(item)),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

export function toRequestTranslationResponse(
  result: RequestTranslationResult,
): RequestTranslationResponseDto {
  return {
    kind: result.kind,
    job: result.job === undefined ? undefined : toTranslationJobSummaryResponse(result.job),
    revision:
      result.revision === undefined
        ? undefined
        : toTranslationRevisionSummaryResponse(result.revision),
  };
}

export function toBulkTranslationResponse(
  result: BulkTranslationResult,
): BulkTranslationResponseDto {
  return {
    queuedCount: result.queuedCount,
    existingCount: result.existingCount,
    skippedCount: result.skippedCount,
    results: result.results.map((item) => toRequestTranslationResponse(item)),
  };
}

export function toLocalizationPreviewResponse(input: {
  readonly resource: TranslationResourceSnapshot;
  readonly resolution: LocalizedResourceResolution;
}): LocalizationPreviewResponseDto {
  return {
    resource: toTranslationResourceSummaryResponse(input.resource),
    payload: input.resolution.payload,
    requestedLocale: input.resolution.requestedLocale,
    resolvedLocale: input.resolution.resolvedLocale,
    sourceLocale: input.resolution.sourceLocale,
    translationStatus: input.resolution.translationStatus,
    isFallback: input.resolution.isFallback,
    translationRevisionId: input.resolution.translationRevisionId,
    sourceContentHash: input.resolution.sourceContentHash,
  };
}
