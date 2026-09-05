import { Repository } from 'typeorm';
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
  });
});
