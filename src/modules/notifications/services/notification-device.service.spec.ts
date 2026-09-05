import { Repository } from 'typeorm';
import { NotificationDeviceEntity } from '../entities/notification-device.entity';
import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
} from '../enums/notification.enums';
import {
  InvalidNotificationDeviceProviderError,
  InvalidNotificationDeviceTokenError,
  NotificationDeviceNotFoundError,
} from '../errors/notification.errors';
import { NotificationDeviceService } from './notification-device.service';

describe('NotificationDeviceService', () => {
  let service: NotificationDeviceService;
  let repository: jest.Mocked<Repository<NotificationDeviceEntity>>;

  const mockDate = new Date('2026-09-01T00:00:00.000Z');

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationDeviceEntity>>;

    service = new NotificationDeviceService(repository);
  });

  describe('registerDevice — Platform/Provider validation', () => {
    const userId = 'u0000000-0000-0000-0000-000000000001';

    it('accepts valid platform/provider pairs', async () => {
      const validPairs: [NotificationDevicePlatform, NotificationDeviceProvider][] = [
        [NotificationDevicePlatform.Ios, NotificationDeviceProvider.Expo],
        [NotificationDevicePlatform.Ios, NotificationDeviceProvider.Apns],
        [NotificationDevicePlatform.Android, NotificationDeviceProvider.Expo],
        [NotificationDevicePlatform.Android, NotificationDeviceProvider.Fcm],
        [NotificationDevicePlatform.Web, NotificationDeviceProvider.WebPush],
      ];

      for (const [platform, provider] of validPairs) {
        repository.findOne.mockResolvedValue(null);
        repository.create.mockImplementation((dto) => ({
          ...dto,
          id: 'dev-1',
          createdAt: mockDate,
          updatedAt: mockDate,
        } as any));
        repository.save.mockImplementation((entity) => Promise.resolve(entity as any));

        const result = await service.registerDevice({
          userId,
          platform,
          provider,
          token: `token-${platform}-${provider}`,
        });

        expect(result.platform).toBe(platform);
        expect(result.provider).toBe(provider);
      }
    });

    it('rejects invalid platform/provider combinations (e.g. WEB + APNS)', async () => {
      await expect(
        service.registerDevice({
          userId,
          platform: NotificationDevicePlatform.Web,
          provider: NotificationDeviceProvider.Apns,
          token: 'token-web-apns',
        }),
      ).rejects.toThrow(InvalidNotificationDeviceProviderError);

      await expect(
        service.registerDevice({
          userId,
          platform: NotificationDevicePlatform.Ios,
          provider: NotificationDeviceProvider.WebPush,
          token: 'token-ios-webpush',
        }),
      ).rejects.toThrow(InvalidNotificationDeviceProviderError);
    });

    it('rejects empty or whitespace token', async () => {
      await expect(
        service.registerDevice({
          userId,
          platform: NotificationDevicePlatform.Ios,
          provider: NotificationDeviceProvider.Expo,
          token: '   ',
        }),
      ).rejects.toThrow(InvalidNotificationDeviceTokenError);
    });
  });

  describe('registerDevice — Ownership transfer & token uniqueness', () => {
    const callerId = 'u0000000-0000-0000-0000-000000000001';
    const previousUserId = 'u0000000-0000-0000-0000-000000000099';
    const token = 'shared-device-push-token-123';

    it('reassigns token to current caller when token already exists for another user', async () => {
      const existingEntity = {
        id: 'd0000000-0000-0000-0000-000000000001',
        userId: previousUserId,
        platform: NotificationDevicePlatform.Android,
        provider: NotificationDeviceProvider.Fcm,
        token,
        isActive: true,
        appVersion: '1.0.0',
        locale: 'en-US',
        lastSeenAt: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as NotificationDeviceEntity;

      repository.findOne.mockResolvedValue(existingEntity);
      repository.save.mockImplementation((e) => Promise.resolve(e as any));

      const result = await service.registerDevice({
        userId: callerId,
        platform: NotificationDevicePlatform.Android,
        provider: NotificationDeviceProvider.Fcm,
        token,
        appVersion: '2.0.0',
        locale: 'vi-VN',
      });

      expect(existingEntity.userId).toBe(callerId);
      expect(existingEntity.appVersion).toBe('2.0.0');
      expect(result.userId).toBe(callerId);
    });
  });

  describe('deactivateDeviceById', () => {
    const callerId = 'u0000000-0000-0000-0000-000000000001';
    const deviceId = 'd0000000-0000-0000-0000-000000000001';

    it('soft deactivates device owned by caller', async () => {
      const device = {
        id: deviceId,
        userId: callerId,
        isActive: true,
        platform: NotificationDevicePlatform.Ios,
        provider: NotificationDeviceProvider.Expo,
        token: 'token-1',
        lastSeenAt: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as NotificationDeviceEntity;

      repository.findOne.mockResolvedValue(device);
      repository.save.mockResolvedValue(device);

      const result = await service.deactivateDeviceById(deviceId, callerId);

      expect(device.isActive).toBe(false);
      expect(result.isActive).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(device);
    });

    it('throws NotificationDeviceNotFoundError when device not found or belongs to another user', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.deactivateDeviceById(deviceId, callerId),
      ).rejects.toThrow(NotificationDeviceNotFoundError);
    });

    it('is idempotent when device is already deactivated', async () => {
      const device = {
        id: deviceId,
        userId: callerId,
        isActive: false,
        platform: NotificationDevicePlatform.Ios,
        provider: NotificationDeviceProvider.Expo,
        token: 'token-1',
        lastSeenAt: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as NotificationDeviceEntity;

      repository.findOne.mockResolvedValue(device);

      const result = await service.deactivateDeviceById(deviceId, callerId);

      expect(result.isActive).toBe(false);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
