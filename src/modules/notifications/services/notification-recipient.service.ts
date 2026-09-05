import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { NotificationRecipientEntity } from '../entities/notification-recipient.entity';
import { NotificationRecipientNotFoundError } from '../errors/notification.errors';
import type {
  CreateNotificationRecipientInput,
  NotificationRecipientSnapshot,
} from '../interfaces/notification.interfaces';

export function toNotificationRecipientSnapshot(
  entity: NotificationRecipientEntity,
): NotificationRecipientSnapshot {
  return {
    id: entity.id,
    notificationId: entity.notificationId,
    recipientUserId: entity.recipientUserId,
    isRead: entity.isRead,
    readAt: entity.readAt,
    isDismissed: entity.isDismissed,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class NotificationRecipientService {
  constructor(
    @InjectRepository(NotificationRecipientEntity)
    private readonly repository: Repository<NotificationRecipientEntity>,
  ) {}

  async addRecipient(
    input: CreateNotificationRecipientInput,
  ): Promise<NotificationRecipientSnapshot> {
    const notificationId = normalizeUuid(input.notificationId);
    const recipientUserId = normalizeUuid(input.recipientUserId);

    const existing = await this.repository.findOne({
      where: { notificationId, recipientUserId },
    });
    if (existing) {
      return toNotificationRecipientSnapshot(existing);
    }

    const entity = this.repository.create({
      notificationId,
      recipientUserId,
      isRead: false,
      readAt: null,
      isDismissed: false,
    });

    const saved = await this.repository.save(entity);
    return toNotificationRecipientSnapshot(saved);
  }

  async addRecipientsBatch(
    notificationId: string,
    recipientUserIds: readonly string[],
  ): Promise<readonly NotificationRecipientSnapshot[]> {
    const nid = normalizeUuid(notificationId);
    const uniqueUserIds = Array.from(new Set(recipientUserIds.map(normalizeUuid)));

    if (uniqueUserIds.length === 0) {
      return [];
    }

    const existing = await this.repository.find({
      where: uniqueUserIds.map((uid) => ({ notificationId: nid, recipientUserId: uid })),
    });
    const existingUserIds = new Set(existing.map((e) => e.recipientUserId));

    const toInsert = uniqueUserIds
      .filter((uid) => !existingUserIds.has(uid))
      .map((uid) =>
        this.repository.create({
          notificationId: nid,
          recipientUserId: uid,
          isRead: false,
          readAt: null,
          isDismissed: false,
        }),
      );

    if (toInsert.length > 0) {
      const saved = await this.repository.save(toInsert);
      return [...existing.map(toNotificationRecipientSnapshot), ...saved.map(toNotificationRecipientSnapshot)];
    }

    return existing.map(toNotificationRecipientSnapshot);
  }

  async markRead(
    notificationId: string,
    recipientUserId: string,
  ): Promise<NotificationRecipientSnapshot> {
    const nid = normalizeUuid(notificationId);
    const uid = normalizeUuid(recipientUserId);

    const entity = await this.repository.findOne({
      where: { notificationId: nid, recipientUserId: uid },
    });
    if (!entity) {
      throw new NotificationRecipientNotFoundError();
    }

    entity.isRead = true;
    entity.readAt = new Date();

    const saved = await this.repository.save(entity);
    return toNotificationRecipientSnapshot(saved);
  }

  async markDismissed(
    notificationId: string,
    recipientUserId: string,
  ): Promise<NotificationRecipientSnapshot> {
    const nid = normalizeUuid(notificationId);
    const uid = normalizeUuid(recipientUserId);

    const entity = await this.repository.findOne({
      where: { notificationId: nid, recipientUserId: uid },
    });
    if (!entity) {
      throw new NotificationRecipientNotFoundError();
    }

    entity.isDismissed = true;

    const saved = await this.repository.save(entity);
    return toNotificationRecipientSnapshot(saved);
  }

  async listUserRecipients(
    recipientUserId: string,
    options?: { readonly limit?: number; readonly unreadOnly?: boolean },
  ): Promise<readonly NotificationRecipientSnapshot[]> {
    const uid = normalizeUuid(recipientUserId);
    const qb = this.repository
      .createQueryBuilder('recipient')
      .where('recipient.recipientUserId = :uid', { uid })
      .andWhere('recipient.isDismissed = :isDismissed', { isDismissed: false })
      .orderBy('recipient.createdAt', 'DESC');

    if (options?.unreadOnly) {
      qb.andWhere('recipient.isRead = :isRead', { isRead: false });
    }

    if (options?.limit) {
      qb.take(options.limit);
    }

    const entities = await qb.getMany();
    return entities.map(toNotificationRecipientSnapshot);
  }
}
