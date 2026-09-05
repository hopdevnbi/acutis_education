import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { EventTargetEntity } from '../entities/event-target.entity';
import type {
  CreateEventTargetInput,
  EventTargetSnapshot,
} from '../interfaces/event.interfaces';
import { buildEventTargetKey } from '../utils/event-key.util';

export function toEventTargetSnapshot(entity: EventTargetEntity): EventTargetSnapshot {
  return {
    id: entity.id,
    eventId: entity.eventId,
    targetType: entity.targetType,
    parishId: entity.parishId,
    classId: entity.classId,
    roleCode: entity.roleCode,
    targetKey: entity.targetKey,
    createdAt: entity.createdAt,
  };
}

@Injectable()
export class EventTargetService {
  constructor(
    @InjectRepository(EventTargetEntity)
    private readonly repository: Repository<EventTargetEntity>,
  ) {}

  async addTarget(input: CreateEventTargetInput): Promise<EventTargetSnapshot> {
    const targetKey = buildEventTargetKey({
      targetType: input.targetType,
      parishId: input.parishId,
      classId: input.classId,
      roleCode: input.roleCode,
    });

    const eventId = normalizeUuid(input.eventId);

    const existing = await this.repository.findOne({
      where: { eventId, targetKey },
    });
    if (existing) {
      return toEventTargetSnapshot(existing);
    }

    const entity = this.repository.create({
      eventId,
      targetType: input.targetType,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      classId: input.classId ? normalizeUuid(input.classId) : null,
      roleCode: input.roleCode ? input.roleCode.trim().toUpperCase() : null,
      targetKey,
    });

    const saved = await this.repository.save(entity);
    return toEventTargetSnapshot(saved);
  }

  async listTargetsByEventId(eventId: string): Promise<readonly EventTargetSnapshot[]> {
    const entities = await this.repository.find({
      where: { eventId: normalizeUuid(eventId) },
    });
    return entities.map(toEventTargetSnapshot);
  }

  async removeTargetsByEventId(eventId: string): Promise<void> {
    await this.repository.delete({ eventId: normalizeUuid(eventId) });
  }
}
