import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AnnouncementEntity } from '../entities/announcement.entity';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
} from '../enums/announcement.enums';
import {
  AnnouncementNotFoundError,
  InvalidAnnouncementTransitionError,
} from '../errors/announcement.errors';
import type {
  AnnouncementSnapshot,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '../interfaces/announcement.interfaces';

export function toAnnouncementSnapshot(entity: AnnouncementEntity): AnnouncementSnapshot {
  return {
    id: entity.id,
    title: entity.title,
    body: entity.body,
    summary: entity.summary,
    locale: entity.locale,
    priority: entity.priority,
    status: entity.status,
    scopeType: entity.scopeType,
    parishId: entity.parishId,
    startsAt: entity.startsAt,
    endsAt: entity.endsAt,
    isPinned: entity.isPinned,
    coverMediaAssetId: entity.coverMediaAssetId,
    publishedAt: entity.publishedAt,
    createdByUserId: entity.createdByUserId,
    updatedByUserId: entity.updatedByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class AnnouncementInternalService {
  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly repository: Repository<AnnouncementEntity>,
  ) {}

  async create(input: CreateAnnouncementInput): Promise<AnnouncementSnapshot> {
    const entity = this.repository.create({
      title: input.title.trim(),
      body: input.body,
      summary: input.summary?.trim() ?? null,
      locale: input.locale ?? 'vi-VN',
      priority: input.priority ?? AnnouncementPriority.Normal,
      status: AnnouncementStatus.Draft,
      scopeType: input.scopeType,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      isPinned: input.isPinned ?? false,
      coverMediaAssetId: input.coverMediaAssetId ? normalizeUuid(input.coverMediaAssetId) : null,
      publishedAt: null,
      createdByUserId: normalizeUuid(input.authorUserId),
      updatedByUserId: normalizeUuid(input.authorUserId),
    });

    const saved = await this.repository.save(entity);
    return toAnnouncementSnapshot(saved);
  }

  async findById(id: string): Promise<AnnouncementSnapshot | null> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    return entity ? toAnnouncementSnapshot(entity) : null;
  }

  async getById(id: string): Promise<AnnouncementSnapshot> {
    const snapshot = await this.findById(id);
    if (!snapshot) {
      throw new AnnouncementNotFoundError();
    }
    return snapshot;
  }

  async update(id: string, input: UpdateAnnouncementInput): Promise<AnnouncementSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new AnnouncementNotFoundError();
    }

    if (input.title !== undefined) {
      entity.title = input.title.trim();
    }
    if (input.body !== undefined) {
      entity.body = input.body;
    }
    if (input.summary !== undefined) {
      entity.summary = input.summary?.trim() ?? null;
    }
    if (input.priority !== undefined) {
      entity.priority = input.priority;
    }
    if (input.startsAt !== undefined) {
      entity.startsAt = input.startsAt;
    }
    if (input.endsAt !== undefined) {
      entity.endsAt = input.endsAt;
    }
    if (input.isPinned !== undefined) {
      entity.isPinned = input.isPinned;
    }
    if (input.coverMediaAssetId !== undefined) {
      entity.coverMediaAssetId = input.coverMediaAssetId
        ? normalizeUuid(input.coverMediaAssetId)
        : null;
    }
    entity.updatedByUserId = normalizeUuid(input.updatedByUserId);

    const saved = await this.repository.save(entity);
    return toAnnouncementSnapshot(saved);
  }

  async publish(id: string, updatedByUserId: string): Promise<AnnouncementSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new AnnouncementNotFoundError();
    }
    if (entity.status === AnnouncementStatus.Archived) {
      throw new InvalidAnnouncementTransitionError('Cannot publish an archived announcement.');
    }

    entity.status = AnnouncementStatus.Published;
    entity.publishedAt = new Date();
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toAnnouncementSnapshot(saved);
  }

  async archive(id: string, updatedByUserId: string): Promise<AnnouncementSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new AnnouncementNotFoundError();
    }

    entity.status = AnnouncementStatus.Archived;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toAnnouncementSnapshot(saved);
  }
}
