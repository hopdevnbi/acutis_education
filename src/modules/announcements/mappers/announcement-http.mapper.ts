import type {
  AnnouncementAdminResponseDto,
  AnnouncementDetailDto,
  AnnouncementListItemDto,
  AnnouncementTargetDto,
} from '../dto/announcement.dto';
import type {
  AnnouncementFeedItemSnapshot,
  AnnouncementTargetSnapshot,
  AnnouncementWithTargetsSnapshot,
} from '../interfaces/announcement.interfaces';

export function toAnnouncementTargetDto(
  target: AnnouncementTargetSnapshot,
): AnnouncementTargetDto {
  return {
    id: target.id,
    targetType: target.targetType,
    parishId: target.parishId,
    classId: target.classId,
    roleCode: target.roleCode,
  };
}

export function toAnnouncementAdminResponseDto(
  item: AnnouncementWithTargetsSnapshot,
): AnnouncementAdminResponseDto {
  const { announcement, targets } = item;
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    summary: announcement.summary,
    locale: announcement.locale,
    priority: announcement.priority,
    status: announcement.status,
    scopeType: announcement.scopeType,
    parishId: announcement.parishId,
    startsAt: announcement.startsAt.toISOString(),
    endsAt: announcement.endsAt ? announcement.endsAt.toISOString() : null,
    isPinned: announcement.isPinned,
    coverMediaAssetId: announcement.coverMediaAssetId,
    publishedAt: announcement.publishedAt ? announcement.publishedAt.toISOString() : null,
    createdByUserId: announcement.createdByUserId,
    updatedByUserId: announcement.updatedByUserId,
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
    targets: targets.map(toAnnouncementTargetDto),
  };
}

export function toAnnouncementListItemDto(
  item: AnnouncementFeedItemSnapshot,
): AnnouncementListItemDto {
  const { announcement, isRead, firstSeenAt } = item;
  return {
    id: announcement.id,
    title: announcement.title,
    summary: announcement.summary,
    priority: announcement.priority,
    locale: announcement.locale,
    startsAt: announcement.startsAt.toISOString(),
    endsAt: announcement.endsAt ? announcement.endsAt.toISOString() : null,
    isPinned: announcement.isPinned,
    coverMediaAssetId: announcement.coverMediaAssetId,
    publishedAt: announcement.publishedAt
      ? announcement.publishedAt.toISOString()
      : new Date().toISOString(),
    isRead,
    firstSeenAt: firstSeenAt ? firstSeenAt.toISOString() : null,
  };
}

export function toAnnouncementDetailDto(
  item: AnnouncementFeedItemSnapshot,
): AnnouncementDetailDto {
  return {
    ...toAnnouncementListItemDto(item),
    body: item.announcement.body,
  };
}
