import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { NotificationEntity } from '../entities/notification.entity';
import {
  DuplicateNotificationError,
  NotificationNotFoundError,
} from '../errors/notification.errors';
import type {
  CreateNotificationInput,
  NotificationSnapshot,
} from '../interfaces/notification.interfaces';

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
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repository: Repository<NotificationEntity>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationSnapshot> {
    const operationKey = input.operationKey.trim();
    const applicationEventId = normalizeUuid(input.applicationEventId);

    const existingByOpKey = await this.repository.findOne({
      where: { operationKey },
    });
    if (existingByOpKey) {
      throw new DuplicateNotificationError(`Notification already exists for operationKey: ${operationKey}`);
    }

    const existingByEventId = await this.repository.findOne({
      where: { applicationEventId },
    });
    if (existingByEventId) {
      throw new DuplicateNotificationError(
        `Notification already exists for applicationEventId: ${applicationEventId}`,
      );
    }

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

    const saved = await this.repository.save(entity);
    return toNotificationSnapshot(saved);
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
