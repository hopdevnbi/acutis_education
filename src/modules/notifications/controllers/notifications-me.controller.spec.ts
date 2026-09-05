import {
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';
import { NotificationsService } from '../notifications.service';
import { NotificationsMeController } from './notifications-me.controller';

describe('NotificationsMeController', () => {
  let controller: NotificationsMeController;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUser = {
    userId: 'u0000000-0000-0000-0000-000000000001',
    roles: ['PARISHIONER'],
  } as any;

  const mockDate = new Date('2026-09-01T00:00:00.000Z');

  beforeEach(() => {
    notificationsService = {
      listUserInbox: jest.fn(),
      getUnreadCount: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    controller = new NotificationsMeController(notificationsService);
  });

  it('GET /me/notifications delegates to listUserInbox with caller userId', async () => {
    notificationsService.listUserInbox.mockResolvedValue({
      items: [
        {
          id: 'n0000000-0000-0000-0000-000000000001',
          notificationId: 'n0000000-0000-0000-0000-000000000001',
          type: NotificationType.AnnouncementPublished,
          sourceType: NotificationSourceType.Announcement,
          sourceId: 's0000000-0000-0000-0000-000000000001',
          title: 'Title',
          snippet: 'Snippet',
          actionUrl: '/test',
          isRead: false,
          readAt: null,
          createdAt: mockDate,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const result = await controller.listInbox(mockUser, { page: 1, limit: 20 });

    expect(notificationsService.listUserInbox).toHaveBeenCalledWith(mockUser.userId, {
      page: 1,
      limit: 20,
      unreadOnly: undefined,
      type: undefined,
      sourceType: undefined,
    });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it('GET /me/notifications/unread-count delegates to getUnreadCount with caller userId', async () => {
    notificationsService.getUnreadCount.mockResolvedValue(5);

    const result = await controller.getUnreadCount(mockUser);

    expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(mockUser.userId);
    expect(result.unreadCount).toBe(5);
  });

  it('POST /me/notifications/:id/read delegates to markRead with caller userId', async () => {
    const notificationId = 'n0000000-0000-0000-0000-000000000001';
    notificationsService.markRead.mockResolvedValue({
      id: notificationId,
      notificationId,
      type: NotificationType.AnnouncementPublished,
      sourceType: NotificationSourceType.Announcement,
      sourceId: 's0000000-0000-0000-0000-000000000001',
      title: 'Title',
      snippet: 'Snippet',
      actionUrl: '/test',
      isRead: true,
      readAt: mockDate,
      createdAt: mockDate,
    });

    const result = await controller.markRead(mockUser, { id: notificationId });

    expect(notificationsService.markRead).toHaveBeenCalledWith(notificationId, mockUser.userId);
    expect(result.isRead).toBe(true);
  });

  it('POST /me/notifications/read-all delegates to markAllRead with caller userId', async () => {
    notificationsService.markAllRead.mockResolvedValue(3);

    const result = await controller.markAllRead(mockUser);

    expect(notificationsService.markAllRead).toHaveBeenCalledWith(mockUser.userId);
    expect(result.updatedCount).toBe(3);
  });
});
