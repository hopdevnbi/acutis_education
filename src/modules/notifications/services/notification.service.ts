import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { NotificationEntity } from '../entities/notification.entity';
import {
  DuplicateNotificationError,
  NotificationEventIdentityConflictError,
  NotificationNotFoundError,
} from '../errors/notification.errors';
import type {
  CreateNotificationInput,
  NotificationHeaderCreationResult,
  NotificationSnapshot,
} from '../interfaces/notification.interfaces';
import { isMssqlUniqueViolation } from '../utils/notifications-http.util';

export function toNotificationSnapshot(entity: NotificationEntity): NotificationSnapshot {
  return {
    id: entity.id,
    applicationEventId: entity.applicationEventId,
    operationKey: entity.operationKey,
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    notificationType: entity.notificationType,
    title: entity.title,
    snippet: entity.snippet,
    actionUrl: entity.actionUrl,
    createdAt: entity.createdAt,
  };
}

@Injectable()
export class NotificationInternalService {
  private readonly logger = new Logger(NotificationInternalService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repository: Repository<NotificationEntity>,
  ) {}

  /**
   * Idempotently creates or retrieves a notification header.
   * - If operationKey already exists: reuses the existing immutable header.
   * - If applicationEventId already exists under a DIFFERENT operationKey: throws identity conflict error.
   * - Under concurrent insert race: catches unique violation and retrieves existing by operationKey.
   */
  async createOrGetHeader(
    input: CreateNotificationInput,
  ): Promise<NotificationHeaderCreationResult> {
    const operationKey = input.operationKey.trim();
    const applicationEventId = normalizeUuid(input.applicationEventId);

    // 1. Check existing by operationKey
    const existingByOpKey = await this.repository.findOne({
      where: { operationKey },
    });

    if (existingByOpKey) {
      if (existingByOpKey.applicationEventId !== applicationEventId) {
        this.logger.warn({
          action: 'notification.header.replay_with_different_event_id',
          operationKey,
          existingEventId: existingByOpKey.applicationEventId,
          newEventId: applicationEventId,
        });
      }
      return {
        notification: toNotificationSnapshot(existingByOpKey),
        isNew: false,
      };
    }

    // 2. Check if applicationEventId exists under a different operationKey (suspicious contract violation)
    const existingByEventId = await this.repository.findOne({
      where: { applicationEventId },
    });

    if (existingByEventId && existingByEventId.operationKey !== operationKey) {
      this.logger.error({
        action: 'notification.header.application_event_id_conflict',
        applicationEventId,
        existingOpKey: existingByEventId.operationKey,
        newOpKey: operationKey,
      });
      throw new NotificationEventIdentityConflictError(
        `ApplicationEventId '${applicationEventId}' is already associated with operationKey '${existingByEventId.operationKey}'.`,
      );
    }

    // 3. Create new notification entity
    const entity = this.repository.create({
      applicationEventId,
      operationKey,
      sourceType: input.sourceType,
      sourceId: normalizeUuid(input.sourceId),
      notificationType: input.notificationType,
      title: input.title.trim(),
      snippet: input.snippet.trim(),
      actionUrl: input.actionUrl.trim(),
    });

    try {
      const saved = await this.repository.save(entity);
      return {
        notification: toNotificationSnapshot(saved),
        isNew: true,
      };
    } catch (error: unknown) {
      if (isMssqlUniqueViolation(error)) {
        // Race condition: concurrent thread inserted with same operationKey or applicationEventId
        const concurrentByOpKey = await this.repository.findOne({
          where: { operationKey },
        });
        if (concurrentByOpKey) {
          return {
            notification: toNotificationSnapshot(concurrentByOpKey),
            isNew: false,
          };
        }

        const concurrentByEventId = await this.repository.findOne({
          where: { applicationEventId },
        });
        if (concurrentByEventId && concurrentByEventId.operationKey !== operationKey) {
          this.logger.error({
            action: 'notification.header.application_event_id_conflict_concurrent',
            applicationEventId,
            existingOpKey: concurrentByEventId.operationKey,
            newOpKey: operationKey,
          });
          throw new NotificationEventIdentityConflictError(
            `ApplicationEventId '${applicationEventId}' is already associated with operationKey '${concurrentByEventId.operationKey}'.`,
          );
        }
      }
      throw error;
    }
  }

  async create(input: CreateNotificationInput): Promise<NotificationSnapshot> {
    const result = await this.createOrGetHeader(input);
    if (!result.isNew) {
      throw new DuplicateNotificationError(
        `Notification already exists for operationKey: ${input.operationKey}`,
      );
    }
    return result.notification;
  }

  async findById(id: string): Promise<NotificationSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    return entity ? toNotificationSnapshot(entity) : null;
  }

  async getById(id: string): Promise<NotificationSnapshot> {
    const snapshot = await this.findById(id);
    if (!snapshot) {
      throw new NotificationNotFoundError();
    }
    return snapshot;
  }

  async findByOperationKey(operationKey: string): Promise<NotificationSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { operationKey: operationKey.trim() },
    });
    return entity ? toNotificationSnapshot(entity) : null;
  }

  async findByApplicationEventId(applicationEventId: string): Promise<NotificationSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { applicationEventId: normalizeUuid(applicationEventId) },
    });
    return entity ? toNotificationSnapshot(entity) : null;
  }
}
