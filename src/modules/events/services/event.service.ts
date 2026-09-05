import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { EventEntity } from '../entities/event.entity';
import { EventStatus } from '../enums/event.enums';
import {
  EventCodeConflictError,
  EventNotFoundError,
  InvalidEventTransitionError,
} from '../errors/event.errors';
import type {
  CreateEventInput,
  EventSnapshot,
  UpdateEventInput,
} from '../interfaces/event.interfaces';
import {
  buildEventScopeKey,
  normalizeEventCode,
} from '../utils/event-key.util';

export function toEventSnapshot(entity: EventEntity): EventSnapshot {
  return {
    id: entity.id,
    code: entity.code,
    title: entity.title,
    description: entity.description,
    summary: entity.summary,
    locale: entity.locale,
    scopeType: entity.scopeType,
    scopeKey: entity.scopeKey,
    parishId: entity.parishId,
    classId: entity.classId,
    status: entity.status,
    timezone: entity.timezone,
    startsAt: entity.startsAt,
    endsAt: entity.endsAt,
    venueName: entity.venueName,
    address: entity.address,
    coverMediaAssetId: entity.coverMediaAssetId,
    capacity: entity.capacity,
    isRegistrationRequired: entity.isRegistrationRequired,
    registrationDeadline: entity.registrationDeadline,
    publishedAt: entity.publishedAt,
    cancelledAt: entity.cancelledAt,
    cancellationReason: entity.cancellationReason,
    version: entity.version,
    createdByUserId: entity.createdByUserId,
    updatedByUserId: entity.updatedByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class EventInternalService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repository: Repository<EventEntity>,
  ) {}

  async create(input: CreateEventInput): Promise<EventSnapshot> {
    const code = normalizeEventCode(input.code);
    const scopeKey = buildEventScopeKey({
      scopeType: input.scopeType,
      parishId: input.parishId,
      classId: input.classId,
    });

    const existing = await this.repository.findOne({ where: { code } });
    if (existing) {
      throw new EventCodeConflictError();
    }

    const entity = this.repository.create({
      code,
      title: input.title.trim(),
      description: input.description,
      summary: input.summary?.trim() ?? null,
      locale: input.locale ?? 'vi-VN',
      scopeType: input.scopeType,
      scopeKey,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      classId: input.classId ? normalizeUuid(input.classId) : null,
      status: EventStatus.Draft,
      timezone: input.timezone ?? 'Asia/Ho_Chi_Minh',
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      venueName: input.venueName?.trim() ?? null,
      address: input.address?.trim() ?? null,
      coverMediaAssetId: input.coverMediaAssetId ? normalizeUuid(input.coverMediaAssetId) : null,
      capacity: input.capacity ?? null,
      isRegistrationRequired: input.isRegistrationRequired ?? false,
      registrationDeadline: input.registrationDeadline ?? null,
      publishedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      version: 0,
      createdByUserId: normalizeUuid(input.authorUserId),
      updatedByUserId: normalizeUuid(input.authorUserId),
    });

    const saved = await this.repository.save(entity);
    return toEventSnapshot(saved);
  }

  async findById(id: string): Promise<EventSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    return entity ? toEventSnapshot(entity) : null;
  }

  async getById(id: string): Promise<EventSnapshot> {
    const snapshot = await this.findById(id);
    if (!snapshot) {
      throw new EventNotFoundError();
    }
    return snapshot;
  }

  async findByCode(code: string): Promise<EventSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { code: normalizeEventCode(code) },
    });
    return entity ? toEventSnapshot(entity) : null;
  }

  async update(id: string, input: UpdateEventInput): Promise<EventSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    if (input.title !== undefined) {
      entity.title = input.title.trim();
    }
    if (input.description !== undefined) {
      entity.description = input.description;
    }
    if (input.summary !== undefined) {
      entity.summary = input.summary?.trim() ?? null;
    }
    if (input.timezone !== undefined) {
      entity.timezone = input.timezone;
    }
    if (input.startsAt !== undefined) {
      entity.startsAt = input.startsAt;
    }
    if (input.endsAt !== undefined) {
      entity.endsAt = input.endsAt;
    }
    if (input.venueName !== undefined) {
      entity.venueName = input.venueName?.trim() ?? null;
    }
    if (input.address !== undefined) {
      entity.address = input.address?.trim() ?? null;
    }
    if (input.coverMediaAssetId !== undefined) {
      entity.coverMediaAssetId = input.coverMediaAssetId
        ? normalizeUuid(input.coverMediaAssetId)
        : null;
    }
    if (input.capacity !== undefined) {
      entity.capacity = input.capacity;
    }
    if (input.isRegistrationRequired !== undefined) {
      entity.isRegistrationRequired = input.isRegistrationRequired;
    }
    if (input.registrationDeadline !== undefined) {
      entity.registrationDeadline = input.registrationDeadline;
    }
    entity.updatedByUserId = normalizeUuid(input.updatedByUserId);

    // Increment version upon mutation
    entity.version += 1;

    const saved = await this.repository.save(entity);
    return toEventSnapshot(saved);
  }

  async publish(id: string, updatedByUserId: string): Promise<EventSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }
    if (entity.status !== EventStatus.Draft) {
      throw new InvalidEventTransitionError(
        `Cannot publish event in status ${entity.status}. Must be DRAFT.`,
      );
    }

    entity.status = EventStatus.Published;
    entity.publishedAt = new Date();
    entity.version = Math.max(1, entity.version + 1);
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toEventSnapshot(saved);
  }

  async cancel(
    id: string,
    reason: string,
    updatedByUserId: string,
  ): Promise<EventSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }
    if (entity.status !== EventStatus.Published) {
      throw new InvalidEventTransitionError(
        `Cannot cancel event in status ${entity.status}. Must be PUBLISHED.`,
      );
    }

    entity.status = EventStatus.Cancelled;
    entity.cancelledAt = new Date();
    entity.cancellationReason = reason.trim();
    entity.version += 1;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toEventSnapshot(saved);
  }

  async complete(id: string, updatedByUserId: string): Promise<EventSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }
    if (entity.status !== EventStatus.Published) {
      throw new InvalidEventTransitionError(
        `Cannot complete event in status ${entity.status}. Must be PUBLISHED.`,
      );
    }

    entity.status = EventStatus.Completed;
    entity.version += 1;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toEventSnapshot(saved);
  }

  async archive(id: string, updatedByUserId: string): Promise<EventSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    entity.status = EventStatus.Archived;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toEventSnapshot(saved);
  }
}
