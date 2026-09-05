import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AnnouncementUserStateEntity } from '../entities/announcement-user-state.entity';
import type { AnnouncementUserStateSnapshot } from '../interfaces/announcement.interfaces';

export function toAnnouncementUserStateSnapshot(
  entity: AnnouncementUserStateEntity,
): AnnouncementUserStateSnapshot {
  return {
    id: entity.id,
    announcementId: entity.announcementId,
    userId: entity.userId,
    firstSeenAt: entity.firstSeenAt,
    readAt: entity.readAt,
    dismissedAt: entity.dismissedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class AnnouncementUserStateService {
  constructor(
    @InjectRepository(AnnouncementUserStateEntity)
    private readonly repository: Repository<AnnouncementUserStateEntity>,
  ) {}

  async markSeen(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot> {
    const aid = normalizeUuid(announcementId);
    const uid = normalizeUuid(userId);

    let state = await this.repository.findOne({
      where: { announcementId: aid, userId: uid },
    });

    if (!state) {
      state = this.repository.create({
        announcementId: aid,
        userId: uid,
        firstSeenAt: new Date(),
        readAt: null,
        dismissedAt: null,
      });
      const saved = await this.repository.save(state);
      return toAnnouncementUserStateSnapshot(saved);
    }

    if (!state.firstSeenAt) {
      state.firstSeenAt = new Date();
      const saved = await this.repository.save(state);
      return toAnnouncementUserStateSnapshot(saved);
    }

    return toAnnouncementUserStateSnapshot(state);
  }

  async markRead(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot> {
    const aid = normalizeUuid(announcementId);
    const uid = normalizeUuid(userId);
    const now = new Date();

    let state = await this.repository.findOne({
      where: { announcementId: aid, userId: uid },
    });

    if (!state) {
      state = this.repository.create({
        announcementId: aid,
        userId: uid,
        firstSeenAt: now,
        readAt: now,
        dismissedAt: null,
      });
    } else {
      if (!state.firstSeenAt) {
        state.firstSeenAt = now;
      }
      state.readAt = now;
    }

    const saved = await this.repository.save(state);
    return toAnnouncementUserStateSnapshot(saved);
  }

  async markDismissed(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot> {
    const aid = normalizeUuid(announcementId);
    const uid = normalizeUuid(userId);
    const now = new Date();

    let state = await this.repository.findOne({
      where: { announcementId: aid, userId: uid },
    });

    if (!state) {
      state = this.repository.create({
        announcementId: aid,
        userId: uid,
        firstSeenAt: now,
        readAt: now,
        dismissedAt: now,
      });
    } else {
      state.dismissedAt = now;
    }

    const saved = await this.repository.save(state);
    return toAnnouncementUserStateSnapshot(saved);
  }

  async getState(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot | null> {
    const state = await this.repository.findOne({
      where: {
        announcementId: normalizeUuid(announcementId),
        userId: normalizeUuid(userId),
      },
    });
    return state ? toAnnouncementUserStateSnapshot(state) : null;
  }
}
