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

export interface CreateAnnouncementInput {
  readonly title: string;
  readonly body: string;
  readonly summary?: string | null;
  readonly locale?: string;
  readonly priority?: AnnouncementPriority;
  readonly scopeType: AnnouncementScopeType;
  readonly parishId?: string | null;
  readonly startsAt: Date;
  readonly endsAt?: Date | null;
  readonly isPinned?: boolean;
  readonly coverMediaAssetId?: string | null;
  readonly authorUserId: string;
}

export interface UpdateAnnouncementInput {
  readonly title?: string;
  readonly body?: string;
  readonly summary?: string | null;
  readonly priority?: AnnouncementPriority;
  readonly startsAt?: Date;
  readonly endsAt?: Date | null;
  readonly isPinned?: boolean;
  readonly coverMediaAssetId?: string | null;
  readonly updatedByUserId: string;
}

export interface CreateAnnouncementTargetInput {
  readonly announcementId: string;
  readonly targetType: CommunicationTargetType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}
