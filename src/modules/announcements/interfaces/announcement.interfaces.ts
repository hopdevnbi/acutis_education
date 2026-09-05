import type {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../enums/announcement.enums';

export interface AnnouncementSnapshot {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly summary: string | null;
  readonly locale: string;
  readonly priority: AnnouncementPriority;
  readonly status: AnnouncementStatus;
  readonly scopeType: AnnouncementScopeType;
  readonly parishId: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly isPinned: boolean;
  readonly coverMediaAssetId: string | null;
  readonly publishedAt: Date | null;
  readonly createdByUserId: string;
  readonly updatedByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AnnouncementTargetSnapshot {
  readonly id: string;
  readonly announcementId: string;
  readonly targetType: CommunicationTargetType;
  readonly parishId: string | null;
  readonly classId: string | null;
  readonly roleCode: string | null;
  readonly targetKey: string;
  readonly createdAt: Date;
}

export interface AnnouncementUserStateSnapshot {
  readonly id: string;
  readonly announcementId: string;
  readonly userId: string;
  readonly firstSeenAt: Date | null;
  readonly readAt: Date | null;
  readonly dismissedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TargetDescriptorInput {
  readonly targetType: CommunicationTargetType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}

export interface CreateAnnouncementInput {
  readonly title: string;
  readonly body: string;
  readonly summary?: string | null;
  readonly locale?: string;
  readonly priority?: AnnouncementPriority;
  readonly scopeType: AnnouncementScopeType;
  readonly parishId?: string | null;
  readonly startsAt?: Date;
  readonly endsAt?: Date | null;
  readonly isPinned?: boolean;
  readonly coverMediaAssetId?: string | null;
  readonly targets: readonly TargetDescriptorInput[];
  readonly authorUserId: string;
}

export interface UpdateAnnouncementInput {
  readonly title?: string;
  readonly body?: string;
  readonly summary?: string | null;
  readonly locale?: string;
  readonly priority?: AnnouncementPriority;
  readonly scopeType?: AnnouncementScopeType;
  readonly parishId?: string | null;
  readonly startsAt?: Date;
  readonly endsAt?: Date | null;
  readonly isPinned?: boolean;
  readonly coverMediaAssetId?: string | null;
  readonly targets?: readonly TargetDescriptorInput[];
  readonly updatedByUserId: string;
}

export interface CreateAnnouncementTargetInput {
  readonly announcementId: string;
  readonly targetType: CommunicationTargetType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}

export interface AnnouncementWithTargetsSnapshot {
  readonly announcement: AnnouncementSnapshot;
  readonly targets: readonly AnnouncementTargetSnapshot[];
}

export interface AnnouncementFeedItemSnapshot {
  readonly announcement: AnnouncementSnapshot;
  readonly isRead: boolean;
  readonly firstSeenAt: Date | null;
}

export interface AnnouncementFeedFilter {
  readonly page: number;
  readonly limit: number;
  readonly priority?: AnnouncementPriority;
  readonly locale?: string;
  readonly unreadOnly?: boolean;
  readonly audienceKeys: readonly string[];
  readonly userId: string;
}

export interface AnnouncementAdminListFilter {
  readonly page: number;
  readonly limit: number;
  readonly status?: AnnouncementStatus;
  readonly priority?: AnnouncementPriority;
  readonly scopeType?: AnnouncementScopeType;
  readonly parishId?: string;
  readonly targetType?: CommunicationTargetType;
  readonly classId?: string;
  readonly locale?: string;
  readonly search?: string;
  readonly isSuperAdmin: boolean;
  readonly adminParishIds: readonly string[];
  readonly assignedClassIds: readonly string[];
  readonly isCatechistOnly: boolean;
}

export interface AnnouncementPaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}
