import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  COMMUNICATION_EVENT_TYPES,
  type CommunicationTargetDescriptor,
  type EventCancelledEvent,
  type EventPublishedEvent,
  type EventUpdatedEvent,
} from '../../application-events/contracts/communication-events.contract';
import {
  APPLICATION_EVENT_PUBLISHER,
  type ApplicationEventPublisher,
} from '../../application-events/ports/application-event.ports';
import { EventEntity } from '../entities/event.entity';
import {
  CommunicationTargetType,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';
import {
  EventCapacityReachedError,
  EventCodeConflictError,
  EventNotFoundError,
} from '../errors/event.errors';
import type {
  CreateEventInput,
  EventAdminListFilter,
  EventPaginatedResult,
  EventRegistrationSnapshot,
  EventSnapshot,
  EventTargetSnapshot,
  EventUserListFilter,
  EventWithTargetsSnapshot,
  UpdateEventInput,
} from '../interfaces/event.interfaces';
import {
  buildEventOperationKey,
  buildEventScopeKey,
  normalizeEventCode,
} from '../utils/event-key.util';
import {
  assertEventFieldsEditable,
  assertValidEventTransition,
  detectEventSignificantChanges,
  validateEventTimeWindow,
} from '../utils/event-lifecycle.util';
import { EventRegistrationService } from './event-registration.service';
import { EventTargetService } from './event-target.service';

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
    private readonly eventTargetService: EventTargetService,
    private readonly eventRegistrationService: EventRegistrationService,
    @Inject(APPLICATION_EVENT_PUBLISHER)
    private readonly eventPublisher: ApplicationEventPublisher,
  ) {}

  async create(input: CreateEventInput): Promise<EventWithTargetsSnapshot> {
    const code = normalizeEventCode(input.code);
    validateEventTimeWindow(input.startsAt, input.endsAt, input.registrationDeadline);

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

    let targets: readonly EventTargetSnapshot[] = [];
    if (input.targets && input.targets.length > 0) {
      targets = await this.eventTargetService.replaceTargets(saved.id, input.targets);
    }

    return {
      event: toEventSnapshot(saved),
      targets,
      activeRegistrationCount: 0,
    };
  }

  async findById(id: string): Promise<EventSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    return entity ? toEventSnapshot(entity) : null;
  }

  async getById(id: string): Promise<EventWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    const targets = await this.eventTargetService.listTargetsByEventId(entity.id);
    const activeRegistrationCount = await this.eventRegistrationService.countActiveByEventId(
      entity.id,
    );

    return {
      event: toEventSnapshot(entity),
      targets,
      activeRegistrationCount,
    };
  }

  async findByCode(code: string): Promise<EventSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { code: normalizeEventCode(code) },
    });
    return entity ? toEventSnapshot(entity) : null;
  }

  async update(id: string, input: UpdateEventInput): Promise<EventWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    const attemptedFields: string[] = [];
    if (input.title !== undefined) attemptedFields.push('title');
    if (input.description !== undefined) attemptedFields.push('description');
    if (input.summary !== undefined) attemptedFields.push('summary');
    if (input.locale !== undefined) attemptedFields.push('locale');
    if (input.scopeType !== undefined) attemptedFields.push('scopeType');
    if (input.parishId !== undefined) attemptedFields.push('parishId');
    if (input.classId !== undefined) attemptedFields.push('classId');
    if (input.timezone !== undefined) attemptedFields.push('timezone');
    if (input.startsAt !== undefined) attemptedFields.push('startsAt');
    if (input.endsAt !== undefined) attemptedFields.push('endsAt');
    if (input.venueName !== undefined) attemptedFields.push('venueName');
    if (input.address !== undefined) attemptedFields.push('address');
    if (input.coverMediaAssetId !== undefined) attemptedFields.push('coverMediaAssetId');
    if (input.capacity !== undefined) attemptedFields.push('capacity');
    if (input.isRegistrationRequired !== undefined) attemptedFields.push('isRegistrationRequired');
    if (input.registrationDeadline !== undefined) attemptedFields.push('registrationDeadline');
    if (input.targets !== undefined) attemptedFields.push('targets');

    assertEventFieldsEditable(entity.status, attemptedFields);

    const newStartsAt = input.startsAt ?? entity.startsAt;
    const newEndsAt = input.endsAt ?? entity.endsAt;
    const newDeadline =
      input.registrationDeadline !== undefined
        ? input.registrationDeadline
        : entity.registrationDeadline;
    validateEventTimeWindow(newStartsAt, newEndsAt, newDeadline);

    let significantChanges: string[] = [];

    if (entity.status === EventStatus.Published) {
      // Capacity verification: cannot reduce below active registration count
      if (input.capacity !== undefined && input.capacity !== null) {
        const activeCount = await this.eventRegistrationService.countActiveByEventId(entity.id);
        if (input.capacity < activeCount) {
          throw new EventCapacityReachedError(
            `Capacity cannot be set below current active registrations (${activeCount}).`,
          );
        }
      }

      significantChanges = detectEventSignificantChanges({
        current: entity,
        updated: input,
      });

      if (significantChanges.length > 0) {
        entity.version = entity.version + 1;
      }
    }

    if (entity.status === EventStatus.Draft) {
      if (input.scopeType !== undefined) entity.scopeType = input.scopeType;
      if (input.parishId !== undefined) {
        entity.parishId = input.parishId ? normalizeUuid(input.parishId) : null;
      }
      if (input.classId !== undefined) {
        entity.classId = input.classId ? normalizeUuid(input.classId) : null;
      }
      entity.scopeKey = buildEventScopeKey({
        scopeType: entity.scopeType,
        parishId: entity.parishId,
        classId: entity.classId,
      });
    }

    if (input.title !== undefined) entity.title = input.title.trim();
    if (input.description !== undefined) entity.description = input.description;
    if (input.summary !== undefined) entity.summary = input.summary?.trim() ?? null;
    if (input.locale !== undefined) entity.locale = input.locale;
    if (input.timezone !== undefined) entity.timezone = input.timezone;
    if (input.startsAt !== undefined) entity.startsAt = input.startsAt;
    if (input.endsAt !== undefined) entity.endsAt = input.endsAt;
    if (input.venueName !== undefined) entity.venueName = input.venueName?.trim() ?? null;
    if (input.address !== undefined) entity.address = input.address?.trim() ?? null;
    if (input.coverMediaAssetId !== undefined) {
      entity.coverMediaAssetId = input.coverMediaAssetId
        ? normalizeUuid(input.coverMediaAssetId)
        : null;
    }
    if (input.capacity !== undefined) entity.capacity = input.capacity;
    if (input.isRegistrationRequired !== undefined) {
      entity.isRegistrationRequired = input.isRegistrationRequired;
    }
    if (input.registrationDeadline !== undefined) {
      entity.registrationDeadline = input.registrationDeadline;
    }

    entity.updatedByUserId = normalizeUuid(input.updatedByUserId);
    const saved = await this.repository.save(entity);

    let targets: readonly EventTargetSnapshot[] = [];
    if (entity.status === EventStatus.Draft && input.targets !== undefined) {
      targets = await this.eventTargetService.replaceTargets(saved.id, input.targets);
    } else {
      targets = await this.eventTargetService.listTargetsByEventId(saved.id);
    }

    // Emit EventUpdatedEvent if significant change occurred on PUBLISHED event
    if (entity.status === EventStatus.Published && significantChanges.length > 0) {
      const targetDescriptors: CommunicationTargetDescriptor[] =
        targets.length > 0
          ? targets.map((t) => ({
              targetType: t.targetType,
              parishId: t.parishId,
              classId: t.classId,
              roleCode: t.roleCode,
            }))
          : [
              {
                targetType: saved.scopeType as unknown as CommunicationTargetType,
                parishId: saved.parishId,
                classId: saved.classId,
              },
            ];

      const eventPayload: EventUpdatedEvent = {
        applicationEventId: generateUuidV4(),
        operationKey: buildEventOperationKey({
          eventType: 'EVENT_UPDATED',
          eventId: saved.id,
          version: saved.version,
        }),
        eventType: COMMUNICATION_EVENT_TYPES.EventUpdated,
        occurredAt: new Date(),
        eventId: saved.id,
        version: saved.version,
        title: saved.title,
        changeSummary: significantChanges.join(', '),
        startsAt: saved.startsAt,
        venueName: saved.venueName,
        targets: targetDescriptors,
        updatedAt: saved.updatedAt,
      };

      await this.eventPublisher.publishCommunicationEvent(eventPayload);
    }

    const activeRegistrationCount = await this.eventRegistrationService.countActiveByEventId(
      saved.id,
    );

    return {
      event: toEventSnapshot(saved),
      targets,
      activeRegistrationCount,
    };
  }

  async publish(id: string, updatedByUserId: string): Promise<EventWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    assertValidEventTransition(entity.status, EventStatus.Published);

    entity.status = EventStatus.Published;
    entity.publishedAt = new Date();
    entity.version = 1;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    const targets = await this.eventTargetService.listTargetsByEventId(saved.id);

    const targetDescriptors: CommunicationTargetDescriptor[] =
      targets.length > 0
        ? targets.map((t) => ({
            targetType: t.targetType,
            parishId: t.parishId,
            classId: t.classId,
            roleCode: t.roleCode,
          }))
        : [
            {
              targetType: saved.scopeType as unknown as CommunicationTargetType,
              parishId: saved.parishId,
              classId: saved.classId,
            },
          ];

    const safeSnippet =
      saved.summary ??
      (saved.description.length > 200
        ? `${saved.description.slice(0, 197)}...`
        : saved.description);

    const eventPayload: EventPublishedEvent = {
      applicationEventId: generateUuidV4(),
      operationKey: buildEventOperationKey({
        eventType: 'EVENT_PUBLISHED',
        eventId: saved.id,
      }),
      eventType: COMMUNICATION_EVENT_TYPES.EventPublished,
      occurredAt: new Date(),
      eventId: saved.id,
      title: saved.title,
      snippet: safeSnippet,
      startsAt: saved.startsAt,
      venueName: saved.venueName,
      targets: targetDescriptors,
      publishedAt: saved.publishedAt,
    };

    await this.eventPublisher.publishCommunicationEvent(eventPayload);

    return {
      event: toEventSnapshot(saved),
      targets,
      activeRegistrationCount: 0,
    };
  }

  async cancel(
    id: string,
    reason: string,
    updatedByUserId: string,
  ): Promise<EventWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    assertValidEventTransition(entity.status, EventStatus.Cancelled);

    entity.status = EventStatus.Cancelled;
    entity.cancelledAt = new Date();
    entity.cancellationReason = reason.trim();
    entity.version = entity.version + 1;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    const targets = await this.eventTargetService.listTargetsByEventId(saved.id);

    const targetDescriptors: CommunicationTargetDescriptor[] =
      targets.length > 0
        ? targets.map((t) => ({
            targetType: t.targetType,
            parishId: t.parishId,
            classId: t.classId,
            roleCode: t.roleCode,
          }))
        : [
            {
              targetType: saved.scopeType as unknown as CommunicationTargetType,
              parishId: saved.parishId,
              classId: saved.classId,
            },
          ];

    // Safe bounded cancellation reason
    const safeReason =
      saved.cancellationReason && saved.cancellationReason.length > 200
        ? `${saved.cancellationReason.slice(0, 197)}...`
        : saved.cancellationReason ?? 'Event cancelled by administration.';

    const eventPayload: EventCancelledEvent = {
      applicationEventId: generateUuidV4(),
      operationKey: buildEventOperationKey({
        eventType: 'EVENT_CANCELLED',
        eventId: saved.id,
      }),
      eventType: COMMUNICATION_EVENT_TYPES.EventCancelled,
      occurredAt: new Date(),
      eventId: saved.id,
      title: saved.title,
      cancellationReason: safeReason,
      targets: targetDescriptors,
      cancelledAt: saved.cancelledAt,
    };

    await this.eventPublisher.publishCommunicationEvent(eventPayload);

    const activeRegistrationCount = await this.eventRegistrationService.countActiveByEventId(
      saved.id,
    );

    return {
      event: toEventSnapshot(saved),
      targets,
      activeRegistrationCount,
    };
  }

  async complete(id: string, updatedByUserId: string): Promise<EventWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    assertValidEventTransition(entity.status, EventStatus.Completed);

    entity.status = EventStatus.Completed;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    const targets = await this.eventTargetService.listTargetsByEventId(saved.id);
    const activeRegistrationCount = await this.eventRegistrationService.countActiveByEventId(
      saved.id,
    );

    return {
      event: toEventSnapshot(saved),
      targets,
      activeRegistrationCount,
    };
  }

  async archive(id: string, updatedByUserId: string): Promise<EventWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new EventNotFoundError();
    }

    assertValidEventTransition(entity.status, EventStatus.Archived);

    entity.status = EventStatus.Archived;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    const targets = await this.eventTargetService.listTargetsByEventId(saved.id);
    const activeRegistrationCount = await this.eventRegistrationService.countActiveByEventId(
      saved.id,
    );

    return {
      event: toEventSnapshot(saved),
      targets,
      activeRegistrationCount,
    };
  }

  async findAdminList(
    filter: EventAdminListFilter,
  ): Promise<EventPaginatedResult<EventWithTargetsSnapshot>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('event');

    if (filter.isSuperAdmin) {
      if (filter.scopeType) {
        qb.andWhere('event.scope_type = :scopeType', { scopeType: filter.scopeType });
      }
      if (filter.parishId) {
        qb.andWhere('event.parish_id = :parishId', {
          parishId: normalizeUuid(filter.parishId),
        });
      }
      if (filter.classId) {
        qb.andWhere('event.class_id = :classId', {
          classId: normalizeUuid(filter.classId),
        });
      }
    } else if (filter.isCatechistOnly) {
      if (filter.assignedClassIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      const classUuids = filter.assignedClassIds.map(normalizeUuid);
      qb.andWhere('event.class_id IN (:...classUuids)', { classUuids });
    } else {
      // ParishAdmin
      if (filter.adminParishIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      const parishUuids = filter.adminParishIds.map(normalizeUuid);
      qb.andWhere('event.parish_id IN (:...parishUuids)', { parishUuids });
    }

    if (filter.status) {
      qb.andWhere('event.status = :status', { status: filter.status });
    }
    if (filter.startsFrom) {
      qb.andWhere('event.starts_at >= :startsFrom', { startsFrom: filter.startsFrom });
    }
    if (filter.startsTo) {
      qb.andWhere('event.starts_at <= :startsTo', { startsTo: filter.startsTo });
    }
    if (filter.locale) {
      qb.andWhere('event.locale = :locale', { locale: filter.locale.trim() });
    }
    if (filter.search) {
      const searchPattern = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(event.code) LIKE :searchPattern OR LOWER(event.title) LIKE :searchPattern OR LOWER(event.summary) LIKE :searchPattern)',
        { searchPattern },
      );
    }

    qb.orderBy('event.starts_at', 'DESC');
    qb.addOrderBy('event.id', 'DESC');
    qb.skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    const eventIds = entities.map((e) => e.id);

    const [targetMap, countMap] = await Promise.all([
      this.eventTargetService.listTargetsByEventIds(eventIds),
      this.eventRegistrationService.countActiveByEventIds(eventIds),
    ]);

    const items: EventWithTargetsSnapshot[] = entities.map((e) => ({
      event: toEventSnapshot(e),
      targets: targetMap.get(e.id) ?? [],
      activeRegistrationCount: countMap.get(e.id) ?? 0,
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findUserList(
    filter: EventUserListFilter,
    now = new Date(),
  ): Promise<EventPaginatedResult<{ event: EventSnapshot; isRegistered: boolean }>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    if (filter.audienceKeys.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const qb = this.repository.createQueryBuilder('event');
    qb.where('event.status = :status', { status: EventStatus.Published });

    if (filter.from) {
      qb.andWhere('event.starts_at >= :from', { from: filter.from });
    } else {
      qb.andWhere('event.ends_at > :now', { now });
    }

    if (filter.to) {
      qb.andWhere('event.ends_at <= :to', { to: filter.to });
    }
    if (filter.locale) {
      qb.andWhere('event.locale = :locale', { locale: filter.locale.trim() });
    }
    if (filter.search) {
      const searchPattern = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(event.title) LIKE :searchPattern OR LOWER(event.summary) LIKE :searchPattern)',
        { searchPattern },
      );
    }

    // Audience match: Target match OR (No targets AND ScopeKey match)
    qb.andWhere(
      `(EXISTS (
        SELECT 1 FROM event_targets target
        WHERE target.event_id = event.id AND target.target_key IN (:...audienceKeys)
      ) OR (
        NOT EXISTS (
          SELECT 1 FROM event_targets noTarget
          WHERE noTarget.event_id = event.id
        ) AND event.scope_key IN (:...audienceKeys)
      ))`,
      { audienceKeys: filter.audienceKeys },
    );

    qb.orderBy('event.starts_at', 'ASC');
    qb.addOrderBy('event.id', 'ASC');
    qb.skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    const eventIds = entities.map((e) => e.id);

    // Active registration check for user
    const userRegistrations = await this.eventRegistrationService.findActiveUserRegistrations(
      eventIds.length > 0 ? eventIds[0] : '', // helper across events if needed
      filter.userId,
      [],
    );

    // More direct: query registrations across all returned eventIds for this user
    let userRegisteredEventIds = new Set<string>();
    if (eventIds.length > 0) {
      const activeRegs = await this.repository.manager
        .getRepository('event_registrations')
        .createQueryBuilder('reg')
        .select('reg.eventId', 'eventId')
        .where('reg.eventId IN (:...eventIds)', { eventIds })
        .andWhere('reg.userId = :userId', { userId: normalizeUuid(filter.userId) })
        .andWhere('reg.status = :status', { status: 'REGISTERED' })
        .getRawMany<{ eventId: string }>();

      userRegisteredEventIds = new Set(activeRegs.map((r) => normalizeUuid(r.eventId)));
    }

    const items = entities.map((entity) => ({
      event: toEventSnapshot(entity),
      isRegistered: userRegisteredEventIds.has(entity.id),
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getUserEventDetail(
    id: string,
    userId: string,
    audienceKeys: readonly string[],
    linkedStudentIds: readonly string[],
    now = new Date(),
  ): Promise<{
    event: EventSnapshot;
    currentUserRegistration: EventRegistrationSnapshot | null;
  } | null> {
    const eid = normalizeUuid(id);
    const qb = this.repository.createQueryBuilder('event');
    qb.where('event.id = :id', { id: eid });
    qb.andWhere('event.status = :status', { status: EventStatus.Published });

    // Audience match
    qb.andWhere(
      `(EXISTS (
        SELECT 1 FROM event_targets target
        WHERE target.event_id = event.id AND target.target_key IN (:...audienceKeys)
      ) OR (
        NOT EXISTS (
          SELECT 1 FROM event_targets noTarget
          WHERE noTarget.event_id = event.id
        ) AND event.scope_key IN (:...audienceKeys)
      ))`,
      { audienceKeys },
    );

    const entity = await qb.getOne();
    if (!entity) {
      return null;
    }

    const eventSnapshot = toEventSnapshot(entity);
    const userRegs = await this.eventRegistrationService.findActiveUserRegistrations(
      eventSnapshot.id,
      userId,
      linkedStudentIds,
    );

    const currentUserRegistration = userRegs.length > 0 ? userRegs[0] : null;

    return {
      event: eventSnapshot,
      currentUserRegistration,
    };
  }
}
