import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../enums/announcement.enums';
import type {
  AnnouncementFeedItemSnapshot,
  AnnouncementWithTargetsSnapshot,
} from '../interfaces/announcement.interfaces';
import {
  toAnnouncementAdminResponseDto,
  toAnnouncementDetailDto,
  toAnnouncementListItemDto,
} from './announcement-http.mapper';

describe('AnnouncementHttpMapper', () => {
  const baseAnnouncement = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Important Catechism Update',
    body: 'Full announcement body with confidential details...',
    summary: 'Brief update',
    locale: 'vi-VN',
    priority: AnnouncementPriority.High,
    status: AnnouncementStatus.Published,
    scopeType: AnnouncementScopeType.Parish,
    parishId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    startsAt: new Date('2026-09-01T00:00:00Z'),
    endsAt: new Date('2026-09-10T00:00:00Z'),
    isPinned: true,
    coverMediaAssetId: null,
    publishedAt: new Date('2026-09-01T01:00:00Z'),
    createdByUserId: 'user-creator',
    updatedByUserId: 'user-updater',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T01:00:00Z'),
  };

  const feedItem: AnnouncementFeedItemSnapshot = {
    announcement: baseAnnouncement,
    isRead: true,
    firstSeenAt: new Date('2026-09-01T02:00:00Z'),
  };

  describe('toAnnouncementListItemDto', () => {
    it('omits body, internal author IDs, and target keys to ensure data minimization', () => {
      const dto = toAnnouncementListItemDto(feedItem);

      expect(dto.id).toBe(baseAnnouncement.id);
      expect(dto.title).toBe(baseAnnouncement.title);
      expect(dto.summary).toBe(baseAnnouncement.summary);
      expect(dto.isRead).toBe(true);
      expect(dto.firstSeenAt).toBe(feedItem.firstSeenAt?.toISOString());

      // Ensure body is NOT exposed in list view
      expect((dto as any).body).toBeUndefined();
      expect((dto as any).createdByUserId).toBeUndefined();
      expect((dto as any).updatedByUserId).toBeUndefined();
    });
  });

  describe('toAnnouncementDetailDto', () => {
    it('includes full body for single detail view', () => {
      const dto = toAnnouncementDetailDto(feedItem);

      expect(dto.id).toBe(baseAnnouncement.id);
      expect(dto.body).toBe(baseAnnouncement.body);
      expect(dto.isRead).toBe(true);
    });
  });

  describe('toAnnouncementAdminResponseDto', () => {
    it('includes author IDs and target descriptors for administration', () => {
      const adminItem: AnnouncementWithTargetsSnapshot = {
        announcement: baseAnnouncement,
        targets: [
          {
            id: 't-1',
            announcementId: baseAnnouncement.id,
            targetType: CommunicationTargetType.Parish,
            parishId: baseAnnouncement.parishId,
            classId: null,
            roleCode: null,
            targetKey: `PARISH:${baseAnnouncement.parishId}`,
            createdAt: new Date(),
          },
        ],
      };

      const dto = toAnnouncementAdminResponseDto(adminItem);

      expect(dto.id).toBe(baseAnnouncement.id);
      expect(dto.createdByUserId).toBe(baseAnnouncement.createdByUserId);
      expect(dto.targets).toHaveLength(1);
      expect(dto.targets[0].targetType).toBe(CommunicationTargetType.Parish);
      expect((dto.targets[0] as any).targetKey).toBeUndefined(); // internal key omitted
    });
  });
});
