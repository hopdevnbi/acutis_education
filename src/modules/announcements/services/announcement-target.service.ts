import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AnnouncementTargetEntity } from '../entities/announcement-target.entity';
import type {
  AnnouncementTargetSnapshot,
  CreateAnnouncementTargetInput,
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

  async listTargetsByAnnouncementId(
    announcementId: string,
  ): Promise<readonly AnnouncementTargetSnapshot[]> {
    const entities = await this.repository.find({
      where: { announcementId: normalizeUuid(announcementId) },
    });
    return entities.map(toAnnouncementTargetSnapshot);
  }

  async removeTargetsByAnnouncementId(announcementId: string): Promise<void> {
    await this.repository.delete({ announcementId: normalizeUuid(announcementId) });
  }
}
