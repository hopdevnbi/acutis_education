import { QueryFailedError, Repository } from 'typeorm';
import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';
import { NotificationEntity } from '../entities/notification.entity';
import {
  DuplicateNotificationError,
  NotificationEventIdentityConflictError,
  NotificationNotFoundError,
} from '../errors/notification.errors';
import {
  NotificationInternalService,
  toNotificationSnapshot,
} from './notification.service';

function createMssqlUniqueError(number: 2601 | 2627): QueryFailedError {
  const error = new QueryFailedError(
    'query',
    [],
    new Error(`Violation of UNIQUE KEY constraint (error ${number})`),
  );
  (error as any).driverError = { number };
  return error;
}

describe('NotificationEnumsAndContracts', () => {
  it('contains expected NotificationSourceType values', () => {
    expect(Object.values(NotificationSourceType)).toEqual(
      expect.arrayContaining(['ANNOUNCEMENT', 'EVENT', 'SYSTEM']),
    );
  });

  it('contains expected NotificationType values', () => {
    expect(Object.values(NotificationType)).toEqual(
      expect.arrayContaining([
        'ANNOUNCEMENT_PUBLISHED',
        'EVENT_PUBLISHED',
        'EVENT_UPDATED',
        'EVENT_CANCELLED',
      ]),
    );
  });

  it('contains expected NotificationDevicePlatform values', () => {
    expect(Object.values(NotificationDevicePlatform)).toEqual(
      expect.arrayContaining(['IOS', 'ANDROID', 'WEB']),
    );
  });

  it('contains expected NotificationDeviceProvider values', () => {
    expect(Object.values(NotificationDeviceProvider)).toEqual(
      expect.arrayContaining(['EXPO', 'FCM', 'APNS', 'WEB_PUSH']),
    );
  });
});

describe('NotificationInternalService', () => {
  let service: NotificationInternalService;
  let repository: jest.Mocked<Repository<NotificationEntity>>;

  const mockDate = new Date('2026-09-01T00:00:00.000Z');

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationEntity>>;

    service = new NotificationInternalService(repository);
  });

  describe('createOrGetHeader', () => {
    it('creates a new notification header when operationKey does not exist', async () => {
      const input = {
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'ANNOUNCEMENT_PUBLISHED:ann-1',
        sourceType: NotificationSourceType.Announcement,
        sourceId: 'b0000000-0000-0000-0000-000000000001',
        notificationType: NotificationType.AnnouncementPublished,
        title: 'New Announcement',
        snippet: 'Important message',
        actionUrl: '/announcements/b0000000-0000-0000-0000-000000000001',
      };

      repository.findOne.mockResolvedValue(null);
      const createdEntity = {
        id: 'c0000000-0000-0000-0000-000000000001',
        applicationEventId: input.applicationEventId,
        operationKey: input.operationKey,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        notificationType: input.notificationType,
        title: input.title,
        snippet: input.snippet,
        actionUrl: input.actionUrl,
        createdAt: mockDate,
      } as NotificationEntity;

      repository.create.mockReturnValue(createdEntity);
      repository.save.mockResolvedValue(createdEntity);

      const result = await service.createOrGetHeader(input);

      expect(result.isNew).toBe(true);
      expect(result.notification.id).toBe(createdEntity.id);
      expect(result.notification.operationKey).toBe(input.operationKey);
    });

    it('returns existing header on exact replay (same operationKey and same applicationEventId)', async () => {
      const existingEntity = {
        id: 'c0000000-0000-0000-0000-000000000001',
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'ANNOUNCEMENT_PUBLISHED:ann-1',
        sourceType: NotificationSourceType.Announcement,
        sourceId: 'b0000000-0000-0000-0000-000000000001',
        notificationType: NotificationType.AnnouncementPublished,
        title: 'New Announcement',
        snippet: 'Important message',
        actionUrl: '/announcements/b0000000-0000-0000-0000-000000000001',
        createdAt: mockDate,
      } as NotificationEntity;

      repository.findOne.mockResolvedValue(existingEntity);

      const result = await service.createOrGetHeader({
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'ANNOUNCEMENT_PUBLISHED:ann-1',
        sourceType: NotificationSourceType.Announcement,
        sourceId: 'b0000000-0000-0000-0000-000000000001',
        notificationType: NotificationType.AnnouncementPublished,
        title: 'New Announcement',
        snippet: 'Important message',
        actionUrl: '/announcements/b0000000-0000-0000-0000-000000000001',
      });

      expect(result.isNew).toBe(false);
      expect(result.notification.id).toBe(existingEntity.id);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('returns existing header on redelivery under different applicationEventId (same operationKey)', async () => {
      const existingEntity = {
        id: 'c0000000-0000-0000-0000-000000000001',
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'ANNOUNCEMENT_PUBLISHED:ann-1',
        sourceType: NotificationSourceType.Announcement,
        sourceId: 'b0000000-0000-0000-0000-000000000001',
        notificationType: NotificationType.AnnouncementPublished,
        title: 'New Announcement',
        snippet: 'Important message',
        actionUrl: '/announcements/b0000000-0000-0000-0000-000000000001',
        createdAt: mockDate,
      } as NotificationEntity;

      repository.findOne.mockResolvedValue(existingEntity);

      const result = await service.createOrGetHeader({
        applicationEventId: 'a0000000-0000-0000-0000-000000000099', // Different event ID
        operationKey: 'ANNOUNCEMENT_PUBLISHED:ann-1',
        sourceType: NotificationSourceType.Announcement,
        sourceId: 'b0000000-0000-0000-0000-000000000001',
        notificationType: NotificationType.AnnouncementPublished,
        title: 'New Announcement',
        snippet: 'Important message',
        actionUrl: '/announcements/b0000000-0000-0000-0000-000000000001',
      });

      expect(result.isNew).toBe(false);
      expect(result.notification.id).toBe(existingEntity.id);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('throws NotificationEventIdentityConflictError if applicationEventId already exists under different operationKey', async () => {
      // First findOne (by opKey) returns null
      // Second findOne (by eventId) returns entity with different opKey
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'c0000000-0000-0000-0000-000000000001',
          applicationEventId: 'a0000000-0000-0000-0000-000000000001',
          operationKey: 'DIFFERENT_OPERATION_KEY',
        } as NotificationEntity);

      await expect(
        service.createOrGetHeader({
          applicationEventId: 'a0000000-0000-0000-0000-000000000001',
          operationKey: 'NEW_OPERATION_KEY',
          sourceType: NotificationSourceType.Announcement,
          sourceId: 'b0000000-0000-0000-0000-000000000001',
          notificationType: NotificationType.AnnouncementPublished,
          title: 'Conflict Test',
          snippet: 'Snippet',
          actionUrl: '/test',
        }),
      ).rejects.toThrow(NotificationEventIdentityConflictError);
    });

    it('reconciles concurrent operationKey insert collision via 2601/2627 unique error catch', async () => {
      const existingEntity = {
        id: 'c0000000-0000-0000-0000-000000000001',
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'CONCURRENT_OP_KEY',
        sourceType: NotificationSourceType.Announcement,
        sourceId: 'b0000000-0000-0000-0000-000000000001',
        notificationType: NotificationType.AnnouncementPublished,
        title: 'Title',
        snippet: 'Snippet',
        actionUrl: '/test',
        createdAt: mockDate,
      } as NotificationEntity;

      // 1. Initial check by opKey -> null
      // 2. Initial check by eventId -> null
      // 3. Save fails with 2601
      // 4. Recovery check by opKey -> finds existingEntity
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingEntity);

      repository.create.mockReturnValue({} as any);
      repository.save.mockRejectedValueOnce(createMssqlUniqueError(2601));

      const result = await service.createOrGetHeader({
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'CONCURRENT_OP_KEY',
        sourceType: NotificationSourceType.Announcement,
        sourceId: 'b0000000-0000-0000-0000-000000000001',
        notificationType: NotificationType.AnnouncementPublished,
        title: 'Title',
        snippet: 'Snippet',
        actionUrl: '/test',
      });

      expect(result.isNew).toBe(false);
      expect(result.notification.id).toBe(existingEntity.id);
    });

    it('detects concurrent applicationEventId identity collision during 2601/2627 unique error catch', async () => {
      const concurrentEntityWithDiffOpKey = {
        id: 'c0000000-0000-0000-0000-000000000001',
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'PRIOR_COMMITTED_OP_KEY',
      } as NotificationEntity;

      // 1. Initial check by opKey -> null
      // 2. Initial check by eventId -> null (race: other thread committed right after)
      // 3. Save fails with 2627
      // 4. Recovery check by opKey -> null
      // 5. Recovery check by eventId -> finds concurrentEntityWithDiffOpKey
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(concurrentEntityWithDiffOpKey);

      repository.create.mockReturnValue({} as any);
      repository.save.mockRejectedValueOnce(createMssqlUniqueError(2627));

      await expect(
        service.createOrGetHeader({
          applicationEventId: 'a0000000-0000-0000-0000-000000000001',
          operationKey: 'NEW_DIFFERENT_OP_KEY',
          sourceType: NotificationSourceType.Announcement,
          sourceId: 'b0000000-0000-0000-0000-000000000001',
          notificationType: NotificationType.AnnouncementPublished,
          title: 'Title',
          snippet: 'Snippet',
          actionUrl: '/test',
        }),
      ).rejects.toThrow(NotificationEventIdentityConflictError);
    });
  });
});
