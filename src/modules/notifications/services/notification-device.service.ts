import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { NotificationDeviceEntity } from '../entities/notification-device.entity';
import type {
  NotificationDeviceSnapshot,
  RegisterNotificationDeviceInput,
} from '../interfaces/notification.interfaces';

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
  constructor(
    @InjectRepository(NotificationDeviceEntity)
    private readonly repository: Repository<NotificationDeviceEntity>,
  ) {}

  async registerDevice(
    input: RegisterNotificationDeviceInput,
  ): Promise<NotificationDeviceSnapshot> {
    const userId = normalizeUuid(input.userId);
    const token = input.token.trim();
    const now = new Date();

    let entity = await this.repository.findOne({ where: { token } });

    if (entity) {
      // Reassign or update ownership
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

    const saved = await this.repository.save(entity);
    return toNotificationDeviceSnapshot(saved);
  }

  async deactivateDevice(token: string): Promise<void> {
    await this.repository.update({ token: token.trim() }, { isActive: false });
  }

  async listActiveDevicesByUser(userId: string): Promise<readonly NotificationDeviceSnapshot[]> {
    const entities = await this.repository.find({
      where: { userId: normalizeUuid(userId), isActive: true },
    });
    return entities.map(toNotificationDeviceSnapshot);
  }
}
