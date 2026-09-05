import type { CmsEntryStatus, CmsEntryType, CmsScopeType } from '../enums/cms.enums';

export interface CmsEntrySnapshot {
  readonly id: string;
  readonly type: CmsEntryType;
  readonly scopeType: CmsScopeType;
  readonly scopeKey: string;
  readonly parishId: string | null;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly body: string;
  readonly locale: string;
  readonly status: CmsEntryStatus;
  readonly coverMediaAssetId: string | null;
  readonly isFeatured: boolean;
  readonly scheduledFor: Date | null;
  readonly publishedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly createdByUserId: string;
  readonly updatedByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCmsEntryInput {
  readonly type: CmsEntryType;
  readonly scopeType: CmsScopeType;
  readonly parishId?: string | null;
  readonly slug: string;
  readonly title: string;
  readonly summary?: string | null;
  readonly body: string;
  readonly locale?: string;
  readonly coverMediaAssetId?: string | null;
  readonly isFeatured?: boolean;
  readonly scheduledFor?: Date | null;
  readonly expiresAt?: Date | null;
  readonly authorUserId: string;
}

export interface UpdateCmsEntryInput {
  readonly type?: CmsEntryType;
  readonly scopeType?: CmsScopeType;
  readonly parishId?: string | null;
  readonly slug?: string;
  readonly title?: string;
  readonly summary?: string | null;
  readonly body?: string;
  readonly locale?: string;
  readonly coverMediaAssetId?: string | null;
  readonly isFeatured?: boolean;
  readonly scheduledFor?: Date | null;
  readonly expiresAt?: Date | null;
  readonly updatedByUserId: string;
}

export interface PublicCmsListFilter {
  readonly page: number;
  readonly limit: number;
  readonly type?: CmsEntryType;
  readonly locale?: string;
  readonly isFeatured?: boolean;
  readonly parishId?: string;
  readonly allowedParishIds: readonly string[];
}

export interface AdminCmsListFilter {
  readonly page: number;
  readonly limit: number;
  readonly status?: CmsEntryStatus;
  readonly type?: CmsEntryType;
  readonly scopeType?: CmsScopeType;
  readonly parishId?: string;
  readonly locale?: string;
  readonly search?: string;
  readonly isSuperAdmin: boolean;
  readonly adminParishIds: readonly string[];
}

export interface CmsPaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface CmsScheduledPublishResult {
  readonly processedCount: number;
  readonly publishedEntryIds: readonly string[];
}
