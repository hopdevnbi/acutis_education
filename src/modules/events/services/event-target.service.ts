import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { EventTargetEntity } from '../entities/event-target.entity';
import type {
  CreateEventTargetInput,
  EventTargetInput,
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

  async replaceTargets(
    eventId: string,
    targets: readonly EventTargetInput[],
  ): Promise<readonly EventTargetSnapshot[]> {
    const eid = normalizeUuid(eventId);

    // Remove existing targets
    await this.repository.delete({ eventId: eid });

    // Deduplicate targets by targetKey
    const targetKeyMap = new Map<string, EventTargetInput>();
    for (const target of targets) {
      const key = buildEventTargetKey({
        targetType: target.targetType,
        parishId: target.parishId,
        classId: target.classId,
        roleCode: target.roleCode,
      });
      if (!targetKeyMap.has(key)) {
        targetKeyMap.set(key, target);
      }
    }

    const entities: EventTargetEntity[] = [];
    for (const [key, t] of targetKeyMap.entries()) {
      entities.push(
        this.repository.create({
          eventId: eid,
          targetType: t.targetType,
          parishId: t.parishId ? normalizeUuid(t.parishId) : null,
          classId: t.classId ? normalizeUuid(t.classId) : null,
          roleCode: t.roleCode ? t.roleCode.trim().toUpperCase() : null,
          targetKey: key,
        }),
      );
    }

    if (entities.length === 0) {
      return [];
    }

    const saved = await this.repository.save(entities);
    return saved.map(toEventTargetSnapshot);
  }

  async listTargetsByEventId(eventId: string): Promise<readonly EventTargetSnapshot[]> {
    const entities = await this.repository.find({
      where: { eventId: normalizeUuid(eventId) },
    });
    return entities.map(toEventTargetSnapshot);
  }

  async listTargetsByEventIds(
    eventIds: readonly string[],
  ): Promise<Map<string, EventTargetSnapshot[]>> {
    const uniqueIds = Array.from(new Set(eventIds.map(normalizeUuid)));
    const targetMap = new Map<string, EventTargetSnapshot[]>();

    if (uniqueIds.length === 0) {
      return targetMap;
    }

    const entities = await this.repository.find({
      where: { eventId: In(uniqueIds) },
    });

    for (const entity of entities) {
      const eid = entity.eventId;
      const list = targetMap.get(eid) ?? [];
      list.push(toEventTargetSnapshot(entity));
      targetMap.set(eid, list);
    }

    return targetMap;
  }

  async removeTargetsByEventId(eventId: string): Promise<void> {
    await this.repository.delete({ eventId: normalizeUuid(eventId) });
  }
}
