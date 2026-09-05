import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { EventRegistrationEntity } from '../entities/event-registration.entity';
import { EventRegistrationStatus } from '../enums/event.enums';
import {
  EventRegistrationConflictError,
  InvalidEventRegistrationError,
} from '../errors/event.errors';
import type {
  CreateEventRegistrationInput,
  EventRegistrationSnapshot,
} from '../interfaces/event.interfaces';
import { buildEventRegistrantKey } from '../utils/event-key.util';

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
  ) {}

  async register(input: CreateEventRegistrationInput): Promise<EventRegistrationSnapshot> {
    const eventId = normalizeUuid(input.eventId);
    const userId = normalizeUuid(input.userId);
    const studentId = input.studentId ? normalizeUuid(input.studentId) : null;
    const enrollmentId = input.enrollmentId ? normalizeUuid(input.enrollmentId) : null;

    const registrantKey = buildEventRegistrantKey({ userId, studentId });

    const existing = await this.repository.findOne({
      where: { eventId, registrantKey },
    });

    if (existing) {
      if (existing.status === EventRegistrationStatus.Registered) {
        throw new EventRegistrationConflictError();
      }
      // Re-activate previously cancelled registration
      existing.status = EventRegistrationStatus.Registered;
      existing.registeredAt = new Date();
      existing.cancelledAt = null;
      const saved = await this.repository.save(existing);
      return toEventRegistrationSnapshot(saved);
    }

    const entity = this.repository.create({
      eventId,
      registrantKey,
      userId,
      studentId,
      enrollmentId,
      status: EventRegistrationStatus.Registered,
      registeredAt: new Date(),
      cancelledAt: null,
      checkedInAt: null,
    });

    const saved = await this.repository.save(entity);
    return toEventRegistrationSnapshot(saved);
  }

  async cancelRegistration(
    eventId: string,
    registrantKey: string,
  ): Promise<EventRegistrationSnapshot> {
    const entity = await this.repository.findOne({
      where: {
        eventId: normalizeUuid(eventId),
        registrantKey,
      },
    });
    if (!entity) {
      throw new InvalidEventRegistrationError('Registration not found.');
    }

    entity.status = EventRegistrationStatus.Cancelled;
    entity.cancelledAt = new Date();

    const saved = await this.repository.save(entity);
    return toEventRegistrationSnapshot(saved);
  }

  async checkIn(
    eventId: string,
    registrantKey: string,
  ): Promise<EventRegistrationSnapshot> {
    const entity = await this.repository.findOne({
      where: {
        eventId: normalizeUuid(eventId),
        registrantKey,
      },
    });
    if (!entity) {
      throw new InvalidEventRegistrationError('Registration not found.');
    }
    if (entity.status !== EventRegistrationStatus.Registered) {
      throw new InvalidEventRegistrationError('Can only check in active registered attendees.');
    }

    entity.status = EventRegistrationStatus.Attended;
    entity.checkedInAt = new Date();

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

  async listRegistrationsByEventId(
    eventId: string,
  ): Promise<readonly EventRegistrationSnapshot[]> {
    const entities = await this.repository.find({
      where: { eventId: normalizeUuid(eventId) },
    });
    return entities.map(toEventRegistrationSnapshot);
  }
}
