import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
} from '../enums/notification.enums';
import { NotificationsService } from '../notifications.service';
import { NotificationDevicesMeController } from './notification-devices-me.controller';

describe('NotificationDevicesMeController', () => {
  let controller: NotificationDevicesMeController;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUser = {
    userId: 'u0000000-0000-0000-0000-000000000001',
    roles: ['PARISHIONER'],
  } as any;

  const mockDate = new Date('2026-09-01T00:00:00.000Z');

  beforeEach(() => {
    notificationsService = {
      registerDevice: jest.fn(),
      deactivateDeviceById: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    controller = new NotificationDevicesMeController(notificationsService);
  });

  it('POST /me/notification-devices registers device and omits token from response', async () => {
    notificationsService.registerDevice.mockResolvedValue({
      id: 'd0000000-0000-0000-0000-000000000001',
      userId: mockUser.userId,
      platform: NotificationDevicePlatform.Ios,
      provider: NotificationDeviceProvider.Expo,
      token: 'secret-token-not-to-echo',
      isActive: true,
      appVersion: '1.2.3',
      locale: 'vi-VN',
      lastSeenAt: mockDate,
      createdAt: mockDate,
      updatedAt: mockDate,
    });

    const result = await controller.registerDevice(mockUser, {
      platform: NotificationDevicePlatform.Ios,
      provider: NotificationDeviceProvider.Expo,
      token: 'secret-token-not-to-echo',
      appVersion: '1.2.3',
      locale: 'vi-VN',
    });

    expect(notificationsService.registerDevice).toHaveBeenCalledWith({
      userId: mockUser.userId,
      platform: NotificationDevicePlatform.Ios,
      provider: NotificationDeviceProvider.Expo,
      token: 'secret-token-not-to-echo',
      appVersion: '1.2.3',
      locale: 'vi-VN',
    });
    expect(result.id).toBe('d0000000-0000-0000-0000-000000000001');
    expect((result as any).token).toBeUndefined(); // Token privacy: NEVER echo token!
  });

  it('DELETE /me/notification-devices/:id delegates to deactivateDeviceById with caller userId', async () => {
    const deviceId = 'd0000000-0000-0000-0000-000000000001';
    notificationsService.deactivateDeviceById.mockResolvedValue({} as any);

    await controller.deactivateDevice(mockUser, { id: deviceId });

    expect(notificationsService.deactivateDeviceById).toHaveBeenCalledWith(
      deviceId,
      mockUser.userId,
    );
  });
});
