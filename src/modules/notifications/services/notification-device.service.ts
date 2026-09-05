import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  NOTIFICATION_DEVICE_TOKEN_MAX_LENGTH,
  VALID_DEVICE_PLATFORM_PROVIDERS,
} from '../constants/notifications-permissions.constants';
import { NotificationDeviceEntity } from '../entities/notification-device.entity';
import {
  InvalidNotificationDeviceProviderError,
  InvalidNotificationDeviceTokenError,
  NotificationDeviceNotFoundError,
} from '../errors/notification.errors';
import type {
  NotificationDeviceSnapshot,
  RegisterNotificationDeviceInput,
} from '../interfaces/notification.interfaces';
import { isMssqlUniqueViolation } from '../utils/notifications-http.util';

export function toNotificationDeviceSnapshot(
  entity: NotificationDeviceEntity,
): NotificationDeviceSnapshot {
  return {
    id: entity.id,
    userId: entity.userId,
    platform: entity.platform,
    provider: entity.provider,
    token: entity.token,
    isActive: entity.isActive,
    appVersion: entity.appVersion,
    locale: entity.locale,
    lastSeenAt: entity.lastSeenAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class NotificationDeviceService {
  private readonly logger = new Logger(NotificationDeviceService.name);

  constructor(
    @InjectRepository(NotificationDeviceEntity)
    private readonly repository: Repository<NotificationDeviceEntity>,
  ) {}

  /**
   * Registers or updates a device token for the user.
   * Handles global token uniqueness and safe ownership transfer:
   * If a device token already exists for another user (e.g. shared device / re-login),
   * it is safely reassigned to the current caller to prevent push leakage.
   */
  async registerDevice(
    input: RegisterNotificationDeviceInput,
  ): Promise<NotificationDeviceSnapshot> {
    // 1. Validate platform / provider compatibility
    const allowedProviders = VALID_DEVICE_PLATFORM_PROVIDERS[input.platform];
    if (!allowedProviders || !allowedProviders.includes(input.provider)) {
      throw new InvalidNotificationDeviceProviderError(
        `Provider '${input.provider}' is not supported for platform '${input.platform}'.`,
      );
    }

    // 2. Validate token
    const token = input.token?.trim();
    if (!token || token.length === 0 || token.length > NOTIFICATION_DEVICE_TOKEN_MAX_LENGTH) {
      throw new InvalidNotificationDeviceTokenError(
        `Device token must be non-empty and at most ${NOTIFICATION_DEVICE_TOKEN_MAX_LENGTH} characters.`,
      );
    }

    const userId = normalizeUuid(input.userId);
    const now = new Date();

    let entity = await this.repository.findOne({ where: { token } });

    if (entity) {
      if (entity.userId !== userId) {
        this.logger.warn({
          action: 'notification.device.ownership_transfer',
          previousUserId: entity.userId,
          newUserId: userId,
          platform: input.platform,
          provider: input.provider,
        });
      }
      entity.userId = userId;
      entity.platform = input.platform;
      entity.provider = input.provider;
      entity.isActive = true;
      if (input.appVersion !== undefined) {
        entity.appVersion = input.appVersion;
      }
      if (input.locale !== undefined) {
        entity.locale = input.locale;
      }
      entity.lastSeenAt = now;
    } else {
      entity = this.repository.create({
        userId,
        platform: input.platform,
        provider: input.provider,
        token,
        isActive: true,
        appVersion: input.appVersion ?? null,
        locale: input.locale ?? null,
        lastSeenAt: now,
      });
    }

    try {
      const saved = await this.repository.save(entity);
      return toNotificationDeviceSnapshot(saved);
    } catch (error: unknown) {
      if (isMssqlUniqueViolation(error)) {
        // Race condition: concurrent thread inserted with same token
        const concurrent = await this.repository.findOne({ where: { token } });
        if (concurrent) {
          concurrent.userId = userId;
          concurrent.platform = input.platform;
          concurrent.provider = input.provider;
          concurrent.isActive = true;
          concurrent.lastSeenAt = now;
          if (input.appVersion !== undefined) {
            concurrent.appVersion = input.appVersion;
          }
          if (input.locale !== undefined) {
            concurrent.locale = input.locale;
          }
          const saved = await this.repository.save(concurrent);
          return toNotificationDeviceSnapshot(saved);
        }
      }
      throw error;
    }
  }

  /**
   * Deactivates a device by its ID for the authenticated owner (soft deactivation).
   * Throws 404 NotificationDeviceNotFoundError if foreign or non-existent (no existence leakage).
   * Idempotent: repeated deactivation of an already deactivated device succeeds safely.
   */
  async deactivateDeviceById(
    deviceId: string,
    userId: string,
  ): Promise<NotificationDeviceSnapshot> {
    if (!isUuidV4(deviceId)) {
      throw new NotificationDeviceNotFoundError();
    }

    const id = normalizeUuid(deviceId);
    const uid = normalizeUuid(userId);

    const device = await this.repository.findOne({
      where: { id, userId: uid },
    });

    if (!device) {
      throw new NotificationDeviceNotFoundError();
    }

    if (device.isActive) {
      device.isActive = false;
      await this.repository.save(device);
    }

    return toNotificationDeviceSnapshot(device);
  }

  // --- Legacy helpers ---

  async deactivateDevice(token: string): Promise<void> {
    await this.repository.update({ token: token.trim() }, { isActive: false });
  }

  async listActiveDevicesByUser(
    userId: string,
  ): Promise<readonly NotificationDeviceSnapshot[]> {
    const entities = await this.repository.find({
      where: { userId: normalizeUuid(userId), isActive: true },
    });
    return entities.map(toNotificationDeviceSnapshot);
  }
}
