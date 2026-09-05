import { Repository } from 'typeorm';
import { NotificationRecipientEntity } from '../entities/notification-recipient.entity';
import { NotificationEntity } from '../entities/notification.entity';
import {
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';
import { NotificationNotFoundError } from '../errors/notification.errors';
import { NotificationRecipientService } from './notification-recipient.service';

describe('NotificationRecipientService', () => {
  let service: NotificationRecipientService;
  let repository: jest.Mocked<Repository<NotificationRecipientEntity>>;
  let notificationRepository: jest.Mocked<Repository<NotificationEntity>>;

  const mockDate = new Date('2026-09-01T00:00:00.000Z');

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationRecipientEntity>>;

    notificationRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationEntity>>;

    service = new NotificationRecipientService(repository, notificationRepository);
  });

  describe('fanOutRecipients', () => {
    it('returns 0 when recipient array is empty', async () => {
      const result = await service.fanOutRecipients(
        'n0000000-0000-0000-0000-000000000001',
        [],
      );
      expect(result).toBe(0);
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('inserts missing recipients in bounded batches, skipping existing rows', async () => {
      const nid = 'n0000000-0000-0000-0000-000000000001';
      const u1 = 'u0000000-0000-0000-0000-000000000001';
      const u2 = 'u0000000-0000-0000-0000-000000000002';

      // u1 already exists, u2 is new
      repository.find.mockResolvedValue([
        { recipientUserId: u1 } as NotificationRecipientEntity,
      ]);

      repository.create.mockImplementation((dto) => dto as NotificationRecipientEntity);
      repository.save.mockResolvedValue([
        { recipientUserId: u2 } as NotificationRecipientEntity,
      ]);

      const count = await service.fanOutRecipients(nid, [u1, u2]);

      expect(count).toBe(1);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ notificationId: nid, recipientUserId: u2 }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count for caller', async () => {
      const userId = 'u0000000-0000-0000-0000-000000000001';
      repository.count.mockResolvedValue(7);

      const count = await service.getUnreadCount(userId);

      expect(count).toBe(7);
      expect(repository.count).toHaveBeenCalledWith({
        where: {
          recipientUserId: userId,
          isRead: false,
          isDismissed: false,
        },
      });
    });
  });

  describe('markRead', () => {
    const nid = 'n0000000-0000-0000-0000-000000000001';
    const uid = 'u0000000-0000-0000-0000-000000000001';

    it('marks unread notification as read and returns item snapshot', async () => {
      const recipientEntity = {
        id: 'r0000000-0000-0000-0000-000000000001',
        notificationId: nid,
        recipientUserId: uid,
        isRead: false,
        readAt: null,
      } as NotificationRecipientEntity;

      const headerEntity = {
        id: nid,
        notificationType: NotificationType.AnnouncementPublished,
        sourceType: NotificationSourceType.Announcement,
        sourceId: 's0000000-0000-0000-0000-000000000001',
        title: 'Title',
        snippet: 'Snippet',
        actionUrl: '/test',
        createdAt: mockDate,
      } as NotificationEntity;

      repository.findOne.mockResolvedValue(recipientEntity);
      repository.save.mockResolvedValue(recipientEntity);
      notificationRepository.findOne.mockResolvedValue(headerEntity);

      const result = await service.markRead(nid, uid);

      expect(recipientEntity.isRead).toBe(true);
      expect(recipientEntity.readAt).toBeInstanceOf(Date);
      expect(result.id).toBe(nid);
      expect(result.isRead).toBe(true);
    });

    it('is idempotent when notification is already read', async () => {
      const originalReadAt = new Date('2026-08-15T00:00:00.000Z');
      const recipientEntity = {
        id: 'r0000000-0000-0000-0000-000000000001',
        notificationId: nid,
        recipientUserId: uid,
        isRead: true,
        readAt: originalReadAt,
      } as NotificationRecipientEntity;

      const headerEntity = {
        id: nid,
        notificationType: NotificationType.AnnouncementPublished,
        sourceType: NotificationSourceType.Announcement,
        sourceId: 's0000000-0000-0000-0000-000000000001',
        title: 'Title',
        snippet: 'Snippet',
        actionUrl: '/test',
        createdAt: mockDate,
      } as NotificationEntity;

      repository.findOne.mockResolvedValue(recipientEntity);
      notificationRepository.findOne.mockResolvedValue(headerEntity);

      const result = await service.markRead(nid, uid);

      expect(repository.save).not.toHaveBeenCalled();
      expect(result.readAt).toBe(originalReadAt);
    });

    it('throws NotificationNotFoundError if recipient record not found or foreign', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.markRead(nid, uid)).rejects.toThrow(
        NotificationNotFoundError,
      );
    });
  });

  describe('markAllRead', () => {
    it('executes set-based update and returns affected count', async () => {
      const uid = 'u0000000-0000-0000-0000-000000000001';
      const mockUpdateQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 4 }),
      };

      repository.createQueryBuilder.mockReturnValue(mockUpdateQueryBuilder as any);

      const count = await service.markAllRead(uid);

      expect(count).toBe(4);
      expect(mockUpdateQueryBuilder.update).toHaveBeenCalledWith(NotificationRecipientEntity);
      expect(mockUpdateQueryBuilder.andWhere).toHaveBeenCalledWith('is_read = :isRead', {
        isRead: false,
      });
    });
  });
});
