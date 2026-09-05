import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { NOTIFICATION_RECIPIENT_BATCH_SIZE } from '../constants/notifications-permissions.constants';
import { NotificationRecipientEntity } from '../entities/notification-recipient.entity';
import { NotificationEntity } from '../entities/notification.entity';
import type {
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';
import {
  NotificationNotFoundError,
  NotificationRecipientNotFoundError,
} from '../errors/notification.errors';
import type {
  CreateNotificationRecipientInput,
  NotificationInboxFilter,
  NotificationInboxItemSnapshot,
  NotificationRecipientSnapshot,
  PaginatedNotificationInbox,
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

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { number?: number };
  return driverError?.number === 2627 || driverError?.number === 2601;
}

@Injectable()
export class NotificationRecipientService {
  private readonly logger = new Logger(NotificationRecipientService.name);

  constructor(
    @InjectRepository(NotificationRecipientEntity)
    private readonly repository: Repository<NotificationRecipientEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  /**
   * Fan-out delivery: inserts recipient rows in bounded batches with idempotency.
   * If partial fan-out occurred previously, retries safely insert only missing recipients.
   */
  async fanOutRecipients(
    notificationId: string,
    recipientUserIds: readonly string[],
  ): Promise<number> {
    const nid = normalizeUuid(notificationId);
    const uniqueUserIds = Array.from(new Set(recipientUserIds.map(normalizeUuid)));

    if (uniqueUserIds.length === 0) {
      return 0;
    }

    let totalInserted = 0;
    const batchSize = NOTIFICATION_RECIPIENT_BATCH_SIZE;

    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const chunk = uniqueUserIds.slice(i, i + batchSize);

      // Check which recipients already exist for this chunk
      const existing = await this.repository.find({
        where: chunk.map((uid) => ({ notificationId: nid, recipientUserId: uid })),
        select: ['recipientUserId'],
      });
      const existingUserIds = new Set(existing.map((e) => normalizeUuid(e.recipientUserId)));

      const toInsert = chunk
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
        try {
          const saved = await this.repository.save(toInsert);
          totalInserted += saved.length;
        } catch (error: unknown) {
          if (isUniqueConstraintViolation(error)) {
            // Concurrent insert race: some recipients were already inserted; retry one by one in chunk
            this.logger.warn({
              action: 'notification.fanout.batch_unique_race_retry',
              notificationId: nid,
            });
            for (const entity of toInsert) {
              try {
                await this.repository.save(entity);
                totalInserted += 1;
              } catch (singleError: unknown) {
                if (!isUniqueConstraintViolation(singleError)) {
                  throw singleError;
                }
              }
            }
          } else {
            throw error;
          }
        }
      }
    }

    return totalInserted;
  }

  /**
   * Inbox listing: paginated inbox for the authenticated caller with optional filters.
   * Joins notification_recipients with notifications table. Excludes dismissed rows.
   */
  async listUserInbox(
    recipientUserId: string,
    filter: NotificationInboxFilter = {},
  ): Promise<PaginatedNotificationInbox> {
    const uid = normalizeUuid(recipientUserId);
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(50, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder('recipient')
      .innerJoin(
        NotificationEntity,
        'notification',
        'notification.id = recipient.notification_id',
      )
      .where('recipient.recipient_user_id = :uid', { uid })
      .andWhere('recipient.is_dismissed = :isDismissed', { isDismissed: false });

    if (filter.unreadOnly) {
      qb.andWhere('recipient.is_read = :isRead', { isRead: false });
    }

    if (filter.type) {
      qb.andWhere('notification.notification_type = :notificationType', {
        notificationType: filter.type,
      });
    }

    if (filter.sourceType) {
      qb.andWhere('notification.source_type = :sourceType', {
        sourceType: filter.sourceType,
      });
    }

    const total = await qb.getCount();

    qb.select([
      'notification.id AS notification_id',
      'notification.source_type AS source_type',
      'notification.source_id AS source_id',
      'notification.notification_type AS notification_type',
      'notification.title AS title',
      'notification.snippet AS snippet',
      'notification.action_url AS action_url',
      'notification.created_at AS created_at',
      'recipient.is_read AS is_read',
      'recipient.read_at AS read_at',
    ])
      .orderBy('notification.created_at', 'DESC')
      .addOrderBy('recipient.id', 'DESC')
      .offset(skip)
      .limit(limit);

    const rows = await qb.getRawMany<{
      notification_id: string;
      source_type: string;
      source_id: string;
      notification_type: string;
      title: string;
      snippet: string;
      action_url: string;
      created_at: Date;
      is_read: boolean | number;
      read_at: Date | null;
    }>();

    const items: NotificationInboxItemSnapshot[] = rows.map((r) => ({
      id: normalizeUuid(r.notification_id),
      notificationId: normalizeUuid(r.notification_id),
      type: r.notification_type as NotificationType,
      sourceType: r.source_type as NotificationSourceType,
      sourceId: normalizeUuid(r.source_id),
      title: r.title,
      snippet: r.snippet,
      actionUrl: r.action_url,
      isRead: Boolean(r.is_read),
      readAt: r.read_at ? new Date(r.read_at) : null,
      createdAt: new Date(r.created_at),
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Unread count: counts active unread notifications for the caller.
   */
  async getUnreadCount(recipientUserId: string): Promise<number> {
    const uid = normalizeUuid(recipientUserId);
    return this.repository.count({
      where: {
        recipientUserId: uid,
        isRead: false,
        isDismissed: false,
      },
    });
  }

  /**
   * Mark one notification read for caller. Returns full inbox item snapshot.
   * Idempotent return (200 OK) if already read.
   */
  async markRead(
    notificationId: string,
    recipientUserId: string,
  ): Promise<NotificationInboxItemSnapshot> {
    const nid = normalizeUuid(notificationId);
    const uid = normalizeUuid(recipientUserId);

    const recipient = await this.repository.findOne({
      where: { notificationId: nid, recipientUserId: uid },
    });

    if (!recipient) {
      throw new NotificationNotFoundError();
    }

    if (!recipient.isRead) {
      recipient.isRead = true;
      recipient.readAt = new Date();
      await this.repository.save(recipient);
    }

    const notification = await this.notificationRepository.findOne({
      where: { id: nid },
    });

    if (!notification) {
      throw new NotificationNotFoundError();
    }

    return {
      id: notification.id,
      notificationId: notification.id,
      type: notification.notificationType,
      sourceType: notification.sourceType,
      sourceId: notification.sourceId,
      title: notification.title,
      snippet: notification.snippet,
      actionUrl: notification.actionUrl,
      isRead: recipient.isRead,
      readAt: recipient.readAt,
      createdAt: notification.createdAt,
    };
  }

  /**
   * Mark all unread notifications read for caller via set-based UPDATE (no row-by-row loop).
   */
  async markAllRead(recipientUserId: string): Promise<number> {
    const uid = normalizeUuid(recipientUserId);
    const now = new Date();

    const result = await this.repository
      .createQueryBuilder()
      .update(NotificationRecipientEntity)
      .set({
        isRead: true,
        readAt: now,
        updatedAt: now,
      })
      .where('recipient_user_id = :uid', { uid })
      .andWhere('is_read = :isRead', { isRead: false })
      .andWhere('is_dismissed = :isDismissed', { isDismissed: false })
      .execute();

    return result.affected ?? 0;
  }

  // --- Legacy / backward compatibility methods ---

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
      return [
        ...existing.map(toNotificationRecipientSnapshot),
        ...saved.map(toNotificationRecipientSnapshot),
      ];
    }

    return existing.map(toNotificationRecipientSnapshot);
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
