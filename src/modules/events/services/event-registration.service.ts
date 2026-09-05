import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { StudentService } from '../../student/services/student.service';
import { EventRegistrationEntity } from '../entities/event-registration.entity';
import { EventEntity } from '../entities/event.entity';
import {
  EventRegistrationStatus,
  EventStatus,
} from '../enums/event.enums';
import {
  EventAlreadyRegisteredError,
  EventCapacityReachedError,
  EventCheckInNotAllowedError,
  EventNotRegistrableError,
  EventRegistrationCannotCancelError,
  EventRegistrationConflictError,
  EventRegistrationNotFoundError,
} from '../errors/event.errors';
import type {
  EventAttendeeListFilter,
  EventAttendeeSnapshot,
  EventPaginatedResult,
  EventRegistrationSnapshot,
  EventRegistrationWithEventSnapshot,
  EventSnapshot,
  MyEventRegistrationsFilter,
} from '../interfaces/event.interfaces';
import { buildEventRegistrantKey } from '../utils/event-key.util';
import { toEventSnapshot } from './event.service';

export function toEventRegistrationSnapshot(
  entity: EventRegistrationEntity,
): EventRegistrationSnapshot {
  return {
    id: entity.id,
    eventId: entity.eventId,
    registrantKey: entity.registrantKey,
    userId: entity.userId,
    studentId: entity.studentId,
    enrollmentId: entity.enrollmentId,
    status: entity.status,
    registeredAt: entity.registeredAt,
    cancelledAt: entity.cancelledAt,
    checkedInAt: entity.checkedInAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class EventRegistrationService {
  constructor(
    @InjectRepository(EventRegistrationEntity)
    private readonly repository: Repository<EventRegistrationEntity>,
    private readonly dataSource: DataSource,
    private readonly studentService: StudentService,
  ) {}

  async register(
    event: EventSnapshot,
    userId: string,
    studentId?: string | null,
    enrollmentId?: string | null,
    now = new Date(),
  ): Promise<EventRegistrationSnapshot> {
    const eid = normalizeUuid(event.id);
    const uid = normalizeUuid(userId);
    const sid = studentId ? normalizeUuid(studentId) : null;
    const enrId = enrollmentId ? normalizeUuid(enrollmentId) : null;
    const registrantKey = buildEventRegistrantKey({ userId: uid, studentId: sid });

    // Validate registration eligibility window
    if (event.status !== EventStatus.Published) {
      throw new EventNotRegistrableError('Registrations are only accepted for PUBLISHED events.');
    }

    if (!event.isRegistrationRequired) {
      throw new EventNotRegistrableError('Registration is not enabled or required for this event.');
    }

    if (now.getTime() >= event.startsAt.getTime()) {
      throw new EventNotRegistrableError('Cannot register for an event that has already started.');
    }

    if (event.registrationDeadline && now.getTime() > event.registrationDeadline.getTime()) {
      throw new EventNotRegistrableError('Event registration deadline has passed.');
    }

    return this.dataSource.transaction(async (manager) => {
      const registrationRepo = manager.getRepository(EventRegistrationEntity);

      // Check existing registration
      const existing = await registrationRepo.findOne({
        where: { eventId: eid, registrantKey },
      });

      if (existing) {
        if (
          existing.status === EventRegistrationStatus.Registered ||
          existing.status === EventRegistrationStatus.Attended
        ) {
          throw new EventAlreadyRegisteredError();
        }

        if (existing.status === EventRegistrationStatus.NoShow) {
          throw new EventRegistrationConflictError(
            'Registrant marked as NO_SHOW cannot re-register for this event.',
          );
        }
      }

      // Capacity verification inside transaction
      if (event.capacity !== null && event.capacity > 0) {
        const activeCount = await registrationRepo.count({
          where: {
            eventId: eid,
            status: In([EventRegistrationStatus.Registered, EventRegistrationStatus.Attended]),
          },
        });

        if (activeCount >= event.capacity) {
          throw new EventCapacityReachedError();
        }
      }

      if (existing && existing.status === EventRegistrationStatus.Cancelled) {
        // Re-activate previously cancelled registration
        existing.status = EventRegistrationStatus.Registered;
        existing.registeredAt = now;
        existing.cancelledAt = null;
        existing.checkedInAt = null;
        if (enrId) {
          existing.enrollmentId = enrId;
        }

        const saved = await registrationRepo.save(existing);
        return toEventRegistrationSnapshot(saved);
      }

      const entity = registrationRepo.create({
        eventId: eid,
        registrantKey,
        userId: uid,
        studentId: sid,
        enrollmentId: enrId,
        status: EventRegistrationStatus.Registered,
        registeredAt: now,
        cancelledAt: null,
        checkedInAt: null,
      });

      const saved = await registrationRepo.save(entity);
      return toEventRegistrationSnapshot(saved);
    });
  }

  async cancelRegistration(
    eventId: string,
    registrantKey: string,
    now = new Date(),
  ): Promise<EventRegistrationSnapshot> {
    const eid = normalizeUuid(eventId);
    const entity = await this.repository.findOne({
      where: { eventId: eid, registrantKey },
    });

    if (!entity) {
      throw new EventRegistrationNotFoundError();
    }

    if (entity.status === EventRegistrationStatus.Cancelled) {
      // Idempotent 200 return
      return toEventRegistrationSnapshot(entity);
    }

    if (
      entity.status === EventRegistrationStatus.Attended ||
      entity.status === EventRegistrationStatus.NoShow
    ) {
      throw new EventRegistrationCannotCancelError(
        'Cannot cancel an attendance record that has already been attended or marked as no-show.',
      );
    }

    entity.status = EventRegistrationStatus.Cancelled;
    entity.cancelledAt = now;

    const saved = await this.repository.save(entity);
    return toEventRegistrationSnapshot(saved);
  }

  async checkIn(
    eventId: string,
    registrationId: string,
    now = new Date(),
  ): Promise<EventRegistrationSnapshot> {
    const eid = normalizeUuid(eventId);
    const rid = normalizeUuid(registrationId);

    const entity = await this.repository.findOne({
      where: { id: rid, eventId: eid },
    });

    if (!entity) {
      throw new EventRegistrationNotFoundError('Registration not found for this event.');
    }

    if (entity.status === EventRegistrationStatus.Attended) {
      // Idempotent 200 return
      return toEventRegistrationSnapshot(entity);
    }

    if (
      entity.status === EventRegistrationStatus.Cancelled ||
      entity.status === EventRegistrationStatus.NoShow
    ) {
      throw new EventCheckInNotAllowedError(
        `Cannot check in a registration with status ${entity.status}.`,
      );
    }

    entity.status = EventRegistrationStatus.Attended;
    entity.checkedInAt = now;

    const saved = await this.repository.save(entity);
    return toEventRegistrationSnapshot(saved);
  }

  async findRegistration(
    eventId: string,
    registrantKey: string,
  ): Promise<EventRegistrationSnapshot | null> {
    const entity = await this.repository.findOne({
      where: {
        eventId: normalizeUuid(eventId),
        registrantKey,
      },
    });
    return entity ? toEventRegistrationSnapshot(entity) : null;
  }

  async findActiveUserRegistrations(
    eventId: string,
    userId: string,
    linkedStudentIds: readonly string[],
  ): Promise<EventRegistrationSnapshot[]> {
    const eid = normalizeUuid(eventId);
    const uid = normalizeUuid(userId);
    const studentKeys = linkedStudentIds.map((sid) => `STUDENT:${normalizeUuid(sid)}`);
    const selfKey = `USER:${uid}`;
    const keysToCheck = [selfKey, ...studentKeys];

    const entities = await this.repository.find({
      where: {
        eventId: eid,
        registrantKey: In(keysToCheck),
        status: In([EventRegistrationStatus.Registered, EventRegistrationStatus.Attended]),
      },
    });

    return entities.map(toEventRegistrationSnapshot);
  }

  async countActiveByEventId(eventId: string): Promise<number> {
    return this.repository.count({
      where: {
        eventId: normalizeUuid(eventId),
        status: In([EventRegistrationStatus.Registered, EventRegistrationStatus.Attended]),
      },
    });
  }

  async countActiveByEventIds(eventIds: readonly string[]): Promise<Map<string, number>> {
    const countMap = new Map<string, number>();
    const uniqueIds = Array.from(new Set(eventIds.map(normalizeUuid)));
    if (uniqueIds.length === 0) {
      return countMap;
    }

    const rows = await this.repository
      .createQueryBuilder('reg')
      .select('reg.eventId', 'eventId')
      .addSelect('COUNT(reg.id)', 'cnt')
      .where('reg.eventId IN (:...uniqueIds)', { uniqueIds })
      .andWhere('reg.status IN (:...statuses)', {
        statuses: [EventRegistrationStatus.Registered, EventRegistrationStatus.Attended],
      })
      .groupBy('reg.eventId')
      .getRawMany<{ eventId: string; cnt: string }>();

    for (const row of rows) {
      countMap.set(normalizeUuid(row.eventId), Number(row.cnt));
    }
    return countMap;
  }

  async findMyRegistrations(
    filter: MyEventRegistrationsFilter,
  ): Promise<EventPaginatedResult<EventRegistrationWithEventSnapshot>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    const uid = normalizeUuid(filter.userId);
    const studentUuids = filter.linkedStudentIds.map(normalizeUuid);

    const qb = this.repository.createQueryBuilder('reg');
    qb.innerJoinAndSelect(EventEntity, 'event', 'event.id = reg.eventId');

    if (studentUuids.length > 0) {
      qb.where(
        '((reg.userId = :uid AND reg.studentId IS NULL) OR reg.studentId IN (:...studentUuids))',
        { uid, studentUuids },
      );
    } else {
      qb.where('reg.userId = :uid AND reg.studentId IS NULL', { uid });
    }

    if (filter.status) {
      qb.andWhere('reg.status = :status', { status: filter.status });
    }

    if (filter.from) {
      qb.andWhere('event.startsAt >= :from', { from: filter.from });
    }

    if (filter.to) {
      qb.andWhere('event.endsAt <= :to', { to: filter.to });
    }

    qb.orderBy('event.startsAt', 'ASC');
    qb.addOrderBy('reg.registeredAt', 'DESC');
    qb.skip(skip).take(limit);

    const rawAndEntities = await qb.getRawAndEntities();
    const total = await qb.getCount();

    const items: EventRegistrationWithEventSnapshot[] = rawAndEntities.entities.map(
      (regEntity, index) => {
        const raw = rawAndEntities.raw[index];
        const eventEntity = new EventEntity();
        eventEntity.id = raw.event_id;
        eventEntity.code = raw.event_code;
        eventEntity.title = raw.event_title;
        eventEntity.description = raw.event_description;
        eventEntity.summary = raw.event_summary;
        eventEntity.locale = raw.event_locale;
        eventEntity.scopeType = raw.event_scope_type;
        eventEntity.scopeKey = raw.event_scope_key;
        eventEntity.parishId = raw.event_parish_id;
        eventEntity.classId = raw.event_class_id;
        eventEntity.status = raw.event_status;
        eventEntity.timezone = raw.event_timezone;
        eventEntity.startsAt = new Date(raw.event_starts_at);
        eventEntity.endsAt = new Date(raw.event_ends_at);
        eventEntity.venueName = raw.event_venue_name;
        eventEntity.address = raw.event_address;
        eventEntity.coverMediaAssetId = raw.event_cover_media_asset_id;
        eventEntity.capacity = raw.event_capacity !== null ? Number(raw.event_capacity) : null;
        eventEntity.isRegistrationRequired = Boolean(raw.event_is_registration_required);
        eventEntity.registrationDeadline = raw.event_registration_deadline
          ? new Date(raw.event_registration_deadline)
          : null;
        eventEntity.publishedAt = raw.event_published_at
          ? new Date(raw.event_published_at)
          : null;
        eventEntity.cancelledAt = raw.event_cancelled_at
          ? new Date(raw.event_cancelled_at)
          : null;
        eventEntity.cancellationReason = raw.event_cancellation_reason;
        eventEntity.version = Number(raw.event_version ?? 0);
        eventEntity.createdByUserId = raw.event_created_by_user_id;
        eventEntity.updatedByUserId = raw.event_updated_by_user_id;
        eventEntity.createdAt = new Date(raw.event_created_at);
        eventEntity.updatedAt = new Date(raw.event_updated_at);

        return {
          registration: toEventRegistrationSnapshot(regEntity),
          event: toEventSnapshot(eventEntity),
        };
      },
    );

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findAttendeeList(
    filter: EventAttendeeListFilter,
  ): Promise<EventPaginatedResult<EventAttendeeSnapshot>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    const eid = normalizeUuid(filter.eventId);
    const qb = this.repository.createQueryBuilder('reg');
    qb.where('reg.eventId = :eid', { eid });

    if (filter.status) {
      qb.andWhere('reg.status = :status', { status: filter.status });
    }

    if (filter.search) {
      const searchPattern = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere('LOWER(reg.registrantKey) LIKE :searchPattern', { searchPattern });
    }

    qb.orderBy('reg.registeredAt', 'DESC');
    qb.addOrderBy('reg.id', 'DESC');
    qb.skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();

    // Batch resolve student names if studentIds are present
    const studentIds = entities
      .map((e) => e.studentId)
      .filter((sid): sid is string => sid !== null);

    const studentMap = new Map<string, string>();
    if (studentIds.length > 0) {
      const studentSnapshots = await this.studentService.getStudentSnapshotsByIds(studentIds);
      for (const s of studentSnapshots) {
        studentMap.set(normalizeUuid(s.id), s.fullName);
      }
    }

    const items: EventAttendeeSnapshot[] = entities.map((entity) => {
      let displayName: string | null = null;
      if (entity.studentId) {
        displayName = studentMap.get(normalizeUuid(entity.studentId)) ?? null;
      }

      return {
        registration: toEventRegistrationSnapshot(entity),
        displayName,
      };
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
