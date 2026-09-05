import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserStatus } from '../../users/enums/user-status.enum';
import type { AnnouncementsService } from '../announcements.service';
import { AnnouncementPriority, AnnouncementScopeType, AnnouncementStatus } from '../enums/announcement.enums';
import type { AnnouncementAudienceResolver } from '../services/announcement-audience.resolver';
import { AnnouncementsController } from './announcements.controller';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;
  let announcementsService: jest.Mocked<Partial<AnnouncementsService>>;
  let audienceResolver: jest.Mocked<Partial<AnnouncementAudienceResolver>>;

  const user: AuthenticatedUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    username: 'testuser',
    email: 'test@example.com',
    status: UserStatus.Active,
    roles: ['CATECHIST'],
    permissions: ['announcements.read'],
  };

  const announcementId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    announcementsService = {
      findUserFeed: jest.fn(),
      getUserFeedItemById: jest.fn(),
      dismissAnnouncement: jest.fn(),
    };
    audienceResolver = {
      resolveAudienceKeys: jest.fn().mockResolvedValue(['GLOBAL', 'PARISH:p1']),
    };

    controller = new AnnouncementsController(
      announcementsService as AnnouncementsService,
      audienceResolver as AnnouncementAudienceResolver,
    );
  });

  describe('getFeed', () => {
    it('returns feed items matching audience keys without writing state', async () => {
      (announcementsService.findUserFeed as jest.Mock).mockResolvedValue({
        items: [
          {
            announcement: {
              id: announcementId,
              title: 'Parish Notice',
              summary: 'Summary...',
              body: 'Full body...',
              locale: 'vi-VN',
              priority: AnnouncementPriority.Normal,
              status: AnnouncementStatus.Published,
              scopeType: AnnouncementScopeType.Parish,
              parishId: 'p1',
              startsAt: new Date(),
              endsAt: null,
              isPinned: false,
              coverMediaAssetId: null,
              publishedAt: new Date(),
              createdByUserId: 'u-1',
              updatedByUserId: 'u-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            isRead: false,
            firstSeenAt: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const response = await controller.getFeed(user, { page: 1, limit: 20 });

      expect(response.total).toBe(1);
      expect(response.items[0].id).toBe(announcementId);
      expect(response.items[0].isRead).toBe(false);
      expect((response.items[0] as any).body).toBeUndefined(); // Data minimization
    });
  });

  describe('getDetail', () => {
    it('returns detail including body and marks read lazily', async () => {
      (announcementsService.getUserFeedItemById as jest.Mock).mockResolvedValue({
        announcement: {
          id: announcementId,
          title: 'Parish Notice',
          summary: 'Summary...',
          body: 'Full body...',
          locale: 'vi-VN',
          priority: AnnouncementPriority.Normal,
          status: AnnouncementStatus.Published,
          scopeType: AnnouncementScopeType.Parish,
          parishId: 'p1',
          startsAt: new Date(),
          endsAt: null,
          isPinned: false,
          coverMediaAssetId: null,
          publishedAt: new Date(),
          createdByUserId: 'u-1',
          updatedByUserId: 'u-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isRead: true,
        firstSeenAt: new Date(),
      });

      const response = await controller.getDetail(user, announcementId);

      expect(response.id).toBe(announcementId);
      expect(response.body).toBe('Full body...');
      expect(response.isRead).toBe(true);
    });

    it('throws NotFoundException when announcement is not visible to actor', async () => {
      (announcementsService.getUserFeedItemById as jest.Mock).mockResolvedValue(null);

      await expect(controller.getDetail(user, announcementId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('dismiss', () => {
    it('dismisses announcement and returns timestamp', async () => {
      (announcementsService.getUserFeedItemById as jest.Mock).mockResolvedValue({} as any);
      const dismissedAt = new Date();
      (announcementsService.dismissAnnouncement as jest.Mock).mockResolvedValue({
        dismissedAt,
      });

      const response = await controller.dismiss(user, announcementId);

      expect(response.announcementId).toBe(announcementId);
      expect(response.dismissedAt).toBe(dismissedAt.toISOString());
    });
  });
});
