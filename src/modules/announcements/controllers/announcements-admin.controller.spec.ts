import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserStatus } from '../../users/enums/user-status.enum';
import type { AnnouncementAccessService } from '../access/announcement-access.service';
import type { AnnouncementsService } from '../announcements.service';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../enums/announcement.enums';
import { AnnouncementsAdminController } from './announcements-admin.controller';

describe('AnnouncementsAdminController', () => {
  let controller: AnnouncementsAdminController;
  let announcementsService: jest.Mocked<Partial<AnnouncementsService>>;
  let announcementAccessService: jest.Mocked<Partial<AnnouncementAccessService>>;

  const user: AuthenticatedUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    username: 'admin',
    email: 'admin@example.com',
    status: UserStatus.Active,
    roles: ['PARISH_ADMIN'],
    permissions: ['announcements.manage', 'announcements.publish'],
  };

  const parishId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const announcementId = '22222222-2222-4222-8222-222222222222';

  const mockSnapshot = {
    announcement: {
      id: announcementId,
      title: 'Parish Event',
      body: 'Body...',
      summary: 'Summary...',
      locale: 'vi-VN',
      priority: AnnouncementPriority.Normal,
      status: AnnouncementStatus.Draft,
      scopeType: AnnouncementScopeType.Parish,
      parishId,
      startsAt: new Date(),
      endsAt: null,
      isPinned: false,
      coverMediaAssetId: null,
      publishedAt: null,
      createdByUserId: user.userId,
      updatedByUserId: user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    targets: [
      {
        id: 't-1',
        announcementId,
        targetType: CommunicationTargetType.Parish,
        parishId,
        classId: null,
        roleCode: null,
        targetKey: `PARISH:${parishId}`,
        createdAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    announcementsService = {
      findAdminList: jest.fn().mockResolvedValue({
        items: [mockSnapshot],
        total: 1,
        page: 1,
        limit: 20,
      }),
      createAnnouncement: jest.fn().mockResolvedValue(mockSnapshot),
      getAnnouncementById: jest.fn().mockResolvedValue(mockSnapshot),
      updateAnnouncement: jest.fn().mockResolvedValue(mockSnapshot),
      publishAnnouncement: jest.fn().mockResolvedValue({
        ...mockSnapshot,
        announcement: {
          ...mockSnapshot.announcement,
          status: AnnouncementStatus.Published,
          publishedAt: new Date(),
        },
      }),
      archiveAnnouncement: jest.fn().mockResolvedValue({
        ...mockSnapshot,
        announcement: {
          ...mockSnapshot.announcement,
          status: AnnouncementStatus.Archived,
        },
      }),
    };

    announcementAccessService = {
      getAdminActorScope: jest.fn().mockResolvedValue({
        isSuperAdmin: false,
        adminParishIds: [parishId],
        assignedClassIds: [],
        isCatechistOnly: false,
      }),
      assertCanCreateAnnouncement: jest.fn().mockResolvedValue(undefined),
      assertCanManageAnnouncement: jest.fn().mockResolvedValue(undefined),
      assertCanPublishAnnouncement: jest.fn().mockResolvedValue(undefined),
      assertCanArchiveAnnouncement: jest.fn().mockResolvedValue(undefined),
    };

    controller = new AnnouncementsAdminController(
      announcementsService as AnnouncementsService,
      announcementAccessService as AnnouncementAccessService,
    );
  });

  describe('listAdmin', () => {
    it('returns paginated admin announcements scoped to actor authority', async () => {
      const response = await controller.listAdmin(user, { page: 1, limit: 20 });

      expect(response.total).toBe(1);
      expect(response.items[0].id).toBe(announcementId);
      expect(response.items[0].targets).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('validates scope and creates announcement draft', async () => {
      const dto = {
        title: 'New Event',
        body: 'Details...',
        scopeType: AnnouncementScopeType.Parish,
        parishId,
        targets: [{ targetType: CommunicationTargetType.Parish, parishId }],
      };

      const response = await controller.create(user, dto as any);

      expect(announcementAccessService.assertCanCreateAnnouncement).toHaveBeenCalledWith(
        user.userId,
        {
          scopeType: dto.scopeType,
          parishId: dto.parishId,
          targets: dto.targets,
        },
      );
      expect(response.id).toBe(announcementId);
    });
  });

  describe('publish', () => {
    it('validates scope and publishes announcement', async () => {
      const response = await controller.publish(user, announcementId);

      expect(announcementAccessService.assertCanPublishAnnouncement).toHaveBeenCalled();
      expect(announcementsService.publishAnnouncement).toHaveBeenCalledWith(
        announcementId,
        user.userId,
      );
      expect(response.status).toBe(AnnouncementStatus.Published);
    });
  });

  describe('archive', () => {
    it('validates scope and archives announcement', async () => {
      const response = await controller.archive(user, announcementId);

      expect(announcementAccessService.assertCanArchiveAnnouncement).toHaveBeenCalled();
      expect(announcementsService.archiveAnnouncement).toHaveBeenCalledWith(
        announcementId,
        user.userId,
      );
      expect(response.status).toBe(AnnouncementStatus.Archived);
    });
  });
});
