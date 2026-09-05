import type { Repository } from 'typeorm';
import type { ApplicationEventPublisher } from '../../application-events/ports/application-event.ports';
import { AnnouncementEntity } from '../entities/announcement.entity';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../enums/announcement.enums';
import {
  AnnouncementAlreadyPublishedError,
  AnnouncementNotFoundError,
  InvalidAnnouncementTargetError,
} from '../errors/announcement.errors';
import type { AnnouncementTargetService } from './announcement-target.service';
import type { AnnouncementUserStateService } from './announcement-user-state.service';
import { AnnouncementInternalService } from './announcement.service';

describe('AnnouncementInternalService', () => {
  let service: AnnouncementInternalService;
  let repository: jest.Mocked<Partial<Repository<AnnouncementEntity>>>;
  let targetService: jest.Mocked<Partial<AnnouncementTargetService>>;
  let userStateService: jest.Mocked<Partial<AnnouncementUserStateService>>;
  let eventPublisher: jest.Mocked<Partial<ApplicationEventPublisher>>;

  const announcementId = '11111111-1111-4111-8111-111111111111';
  const userId = 'user-1';

  beforeEach(() => {
    repository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: announcementId })),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    targetService = {
      replaceTargets: jest.fn().mockResolvedValue([]),
      listTargetsByAnnouncementId: jest.fn().mockResolvedValue([]),
      listTargetsByAnnouncementIds: jest.fn().mockResolvedValue(new Map()),
    };
    userStateService = {
      markRead: jest.fn().mockResolvedValue({
        id: 'state-1',
        announcementId,
        userId,
        firstSeenAt: new Date(),
        readAt: new Date(),
        dismissedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      markDismissed: jest.fn(),
    };
    eventPublisher = {
      publishCommunicationEvent: jest.fn().mockResolvedValue(undefined),
    };

    service = new AnnouncementInternalService(
      repository as Repository<AnnouncementEntity>,
      targetService as AnnouncementTargetService,
      userStateService as AnnouncementUserStateService,
      eventPublisher as ApplicationEventPublisher,
    );
  });

  describe('create', () => {
    it('creates announcement in DRAFT status and replaces targets', async () => {
      const result = await service.create({
        title: 'New Announcement',
        body: 'Details...',
        scopeType: AnnouncementScopeType.Global,
        targets: [{ targetType: CommunicationTargetType.Global }],
        authorUserId: userId,
      });

      expect(result.announcement.status).toBe(AnnouncementStatus.Draft);
      expect(targetService.replaceTargets).toHaveBeenCalledWith(announcementId, [
        { targetType: CommunicationTargetType.Global },
      ]);
    });

    it('throws InvalidAnnouncementTargetError if targets array is empty', async () => {
      await expect(
        service.create({
          title: 'New Announcement',
          body: 'Details...',
          scopeType: AnnouncementScopeType.Global,
          targets: [],
          authorUserId: userId,
        }),
      ).rejects.toThrow(InvalidAnnouncementTargetError);
    });
  });

  describe('publish', () => {
    it('transitions DRAFT to PUBLISHED and emits AnnouncementPublishedEvent with stable operationKey', async () => {
      const entity = {
        id: announcementId,
        title: 'Lenten Mission',
        body: 'Full body content...',
        summary: 'Short summary',
        locale: 'vi-VN',
        priority: AnnouncementPriority.High,
        status: AnnouncementStatus.Draft,
        scopeType: AnnouncementScopeType.Global,
        parishId: null,
        startsAt: new Date(),
        endsAt: null,
        isPinned: false,
        coverMediaAssetId: null,
        publishedAt: null,
        createdByUserId: userId,
        updatedByUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AnnouncementEntity;

      (repository.findOne as jest.Mock).mockResolvedValue(entity);
      (targetService.listTargetsByAnnouncementId as jest.Mock).mockResolvedValue([
        {
          id: 'target-1',
          announcementId,
          targetType: CommunicationTargetType.Global,
          parishId: null,
          classId: null,
          roleCode: null,
          targetKey: 'GLOBAL',
          createdAt: new Date(),
        },
      ]);

      const result = await service.publish(announcementId, userId);

      expect(result.announcement.status).toBe(AnnouncementStatus.Published);
      expect(result.announcement.publishedAt).toBeInstanceOf(Date);

      // Verify event was emitted post-commit
      expect(eventPublisher.publishCommunicationEvent).toHaveBeenCalledTimes(1);
      const emittedEvent = (eventPublisher.publishCommunicationEvent as jest.Mock).mock
        .calls[0][0];

      expect(emittedEvent.eventType).toBe('ANNOUNCEMENT_PUBLISHED');
      expect(emittedEvent.operationKey).toBe(`ANNOUNCEMENT_PUBLISHED:${announcementId}`);
      expect(emittedEvent.title).toBe('Lenten Mission');
      expect(emittedEvent.snippet).toBe('Short summary');
      expect(emittedEvent.targets).toHaveLength(1);
    });

    it('throws AnnouncementAlreadyPublishedError when already published', async () => {
      const entity = {
        id: announcementId,
        status: AnnouncementStatus.Published,
      } as AnnouncementEntity;

      (repository.findOne as jest.Mock).mockResolvedValue(entity);

      await expect(service.publish(announcementId, userId)).rejects.toThrow(
        AnnouncementAlreadyPublishedError,
      );
      expect(eventPublisher.publishCommunicationEvent).not.toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('transitions announcement to ARCHIVED without emitting notification event', async () => {
      const entity = {
        id: announcementId,
        status: AnnouncementStatus.Published,
      } as AnnouncementEntity;

      (repository.findOne as jest.Mock).mockResolvedValue(entity);
      (targetService.listTargetsByAnnouncementId as jest.Mock).mockResolvedValue([]);

      const result = await service.archive(announcementId, userId);

      expect(result.announcement.status).toBe(AnnouncementStatus.Archived);
      expect(eventPublisher.publishCommunicationEvent).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws AnnouncementNotFoundError if entity does not exist', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getById(announcementId)).rejects.toThrow(AnnouncementNotFoundError);
    });
  });
});
