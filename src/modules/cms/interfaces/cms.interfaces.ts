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
  readonly status?: CmsEntryStatus;
  readonly coverMediaAssetId?: string | null;
  readonly isFeatured?: boolean;
  readonly scheduledFor?: Date | null;
  readonly expiresAt?: Date | null;
  readonly authorUserId: string;
}

export interface UpdateCmsEntryInput {
  readonly title?: string;
  readonly summary?: string | null;
  readonly body?: string;
  readonly coverMediaAssetId?: string | null;
  readonly isFeatured?: boolean;
  readonly scheduledFor?: Date | null;
  readonly expiresAt?: Date | null;
  readonly updatedByUserId: string;
}
