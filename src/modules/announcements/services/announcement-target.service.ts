import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AnnouncementTargetEntity } from '../entities/announcement-target.entity';
import type {
  AnnouncementTargetSnapshot,
  CreateAnnouncementTargetInput,
  TargetDescriptorInput,
} from '../interfaces/announcement.interfaces';
import { buildAnnouncementTargetKey } from '../utils/announcement-key.util';

export function toAnnouncementTargetSnapshot(
  entity: AnnouncementTargetEntity,
): AnnouncementTargetSnapshot {
  return {
    id: entity.id,
    announcementId: entity.announcementId,
    targetType: entity.targetType,
    parishId: entity.parishId,
    classId: entity.classId,
    roleCode: entity.roleCode,
    targetKey: entity.targetKey,
    createdAt: entity.createdAt,
  };
}

@Injectable()
export class AnnouncementTargetService {
  constructor(
    @InjectRepository(AnnouncementTargetEntity)
    private readonly repository: Repository<AnnouncementTargetEntity>,
  ) {}

  async addTarget(input: CreateAnnouncementTargetInput): Promise<AnnouncementTargetSnapshot> {
    const targetKey = buildAnnouncementTargetKey({
      targetType: input.targetType,
      parishId: input.parishId,
      classId: input.classId,
      roleCode: input.roleCode,
    });

    const announcementId = normalizeUuid(input.announcementId);

    const existing = await this.repository.findOne({
      where: { announcementId, targetKey },
    });
    if (existing) {
      return toAnnouncementTargetSnapshot(existing);
    }

    const entity = this.repository.create({
      announcementId,
      targetType: input.targetType,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      classId: input.classId ? normalizeUuid(input.classId) : null,
      roleCode: input.roleCode ? input.roleCode.trim().toUpperCase() : null,
      targetKey,
    });

    const saved = await this.repository.save(entity);
    return toAnnouncementTargetSnapshot(saved);
  }

  async replaceTargets(
    announcementId: string,
    targets: readonly TargetDescriptorInput[],
  ): Promise<readonly AnnouncementTargetSnapshot[]> {
    const aid = normalizeUuid(announcementId);

    // Remove existing targets
    await this.repository.delete({ announcementId: aid });

    // Deduplicate targets by targetKey
    const targetKeyMap = new Map<string, TargetDescriptorInput>();
    for (const target of targets) {
      const key = buildAnnouncementTargetKey({
        targetType: target.targetType,
        parishId: target.parishId,
        classId: target.classId,
        roleCode: target.roleCode,
      });
      if (!targetKeyMap.has(key)) {
        targetKeyMap.set(key, target);
      }
    }

    const entities: AnnouncementTargetEntity[] = [];
    for (const [key, t] of targetKeyMap.entries()) {
      entities.push(
        this.repository.create({
          announcementId: aid,
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
    return saved.map(toAnnouncementTargetSnapshot);
  }

  async listTargetsByAnnouncementId(
    announcementId: string,
  ): Promise<readonly AnnouncementTargetSnapshot[]> {
    const entities = await this.repository.find({
      where: { announcementId: normalizeUuid(announcementId) },
    });
    return entities.map(toAnnouncementTargetSnapshot);
  }

  async listTargetsByAnnouncementIds(
    announcementIds: readonly string[],
  ): Promise<Map<string, AnnouncementTargetSnapshot[]>> {
    const uniqueIds = Array.from(new Set(announcementIds.map(normalizeUuid)));
    const targetMap = new Map<string, AnnouncementTargetSnapshot[]>();

    if (uniqueIds.length === 0) {
      return targetMap;
    }

    const entities = await this.repository.find({
      where: { announcementId: In(uniqueIds) },
    });

    for (const entity of entities) {
      const aid = entity.announcementId;
      const list = targetMap.get(aid) ?? [];
      list.push(toAnnouncementTargetSnapshot(entity));
      targetMap.set(aid, list);
    }

    return targetMap;
  }
}
