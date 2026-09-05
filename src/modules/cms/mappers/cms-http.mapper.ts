import type {
  CmsEntryAdminResponseDto,
  CmsEntryDetailDto,
  CmsEntryListItemDto,
} from '../dto/cms-entry.dto';
import type { CmsEntrySnapshot } from '../interfaces/cms.interfaces';

export function toCmsEntryListItemDto(snapshot: CmsEntrySnapshot): CmsEntryListItemDto {
  return {
    id: snapshot.id,
    type: snapshot.type,
    scopeType: snapshot.scopeType,
    parishId: snapshot.parishId,
    slug: snapshot.slug,
    title: snapshot.title,
    summary: snapshot.summary,
    locale: snapshot.locale,
    coverMediaAssetId: snapshot.coverMediaAssetId,
    isFeatured: snapshot.isFeatured,
    publishedAt: snapshot.publishedAt ? snapshot.publishedAt.toISOString() : new Date().toISOString(),
    expiresAt: snapshot.expiresAt ? snapshot.expiresAt.toISOString() : null,
  };
}

export function toCmsEntryDetailDto(snapshot: CmsEntrySnapshot): CmsEntryDetailDto {
  return {
    ...toCmsEntryListItemDto(snapshot),
    body: snapshot.body,
  };
}

export function toCmsEntryAdminResponseDto(snapshot: CmsEntrySnapshot): CmsEntryAdminResponseDto {
  return {
    id: snapshot.id,
    type: snapshot.type,
    scopeType: snapshot.scopeType,
    scopeKey: snapshot.scopeKey,
    parishId: snapshot.parishId,
    slug: snapshot.slug,
    title: snapshot.title,
    summary: snapshot.summary,
    body: snapshot.body,
    locale: snapshot.locale,
    status: snapshot.status,
    coverMediaAssetId: snapshot.coverMediaAssetId,
    isFeatured: snapshot.isFeatured,
    scheduledFor: snapshot.scheduledFor ? snapshot.scheduledFor.toISOString() : null,
    publishedAt: snapshot.publishedAt ? snapshot.publishedAt.toISOString() : null,
    expiresAt: snapshot.expiresAt ? snapshot.expiresAt.toISOString() : null,
    createdByUserId: snapshot.createdByUserId,
    updatedByUserId: snapshot.updatedByUserId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}
