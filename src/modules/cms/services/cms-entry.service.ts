import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CmsEntryEntity } from '../entities/cms-entry.entity';
import { CmsEntryStatus } from '../enums/cms.enums';
import {
  CmsEntryNotFoundError,
  CmsSlugConflictError,
  InvalidCmsTransitionError,
} from '../errors/cms.errors';
import type {
  CmsEntrySnapshot,
  CreateCmsEntryInput,
  UpdateCmsEntryInput,
} from '../interfaces/cms.interfaces';
import { buildCmsScopeKey, normalizeCmsSlug } from '../utils/cms-key.util';

export function toCmsEntrySnapshot(entity: CmsEntryEntity): CmsEntrySnapshot {
  return {
    id: entity.id,
    type: entity.type,
    scopeType: entity.scopeType,
    scopeKey: entity.scopeKey,
    parishId: entity.parishId,
    slug: entity.slug,
    title: entity.title,
    summary: entity.summary,
    body: entity.body,
    locale: entity.locale,
    status: entity.status,
    coverMediaAssetId: entity.coverMediaAssetId,
    isFeatured: entity.isFeatured,
    scheduledFor: entity.scheduledFor,
    publishedAt: entity.publishedAt,
    expiresAt: entity.expiresAt,
    createdByUserId: entity.createdByUserId,
    updatedByUserId: entity.updatedByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class CmsEntryService {
  constructor(
    @InjectRepository(CmsEntryEntity)
    private readonly repository: Repository<CmsEntryEntity>,
  ) {}

  async create(input: CreateCmsEntryInput): Promise<CmsEntrySnapshot> {
    const slug = normalizeCmsSlug(input.slug);
    const scopeKey = buildCmsScopeKey({
      scopeType: input.scopeType,
      parishId: input.parishId,
    });

    const existing = await this.repository.findOne({
      where: { scopeKey, slug },
    });
    if (existing) {
      throw new CmsSlugConflictError();
    }

    const entity = this.repository.create({
      type: input.type,
      scopeType: input.scopeType,
      scopeKey,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      slug,
      title: input.title.trim(),
      summary: input.summary?.trim() ?? null,
      body: input.body,
      locale: input.locale ?? 'vi-VN',
      status: input.status ?? CmsEntryStatus.Draft,
      coverMediaAssetId: input.coverMediaAssetId ? normalizeUuid(input.coverMediaAssetId) : null,
      isFeatured: input.isFeatured ?? false,
      scheduledFor: input.scheduledFor ?? null,
      publishedAt: input.status === CmsEntryStatus.Published ? new Date() : null,
      expiresAt: input.expiresAt ?? null,
      createdByUserId: normalizeUuid(input.authorUserId),
      updatedByUserId: normalizeUuid(input.authorUserId),
    });

    const saved = await this.repository.save(entity);
    return toCmsEntrySnapshot(saved);
  }

  async findById(id: string): Promise<CmsEntrySnapshot | null> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    return entity ? toCmsEntrySnapshot(entity) : null;
  }

  async getById(id: string): Promise<CmsEntrySnapshot> {
    const snapshot = await this.findById(id);
    if (!snapshot) {
      throw new CmsEntryNotFoundError();
    }
    return snapshot;
  }

  async findByScopeAndSlug(scopeKey: string, slug: string): Promise<CmsEntrySnapshot | null> {
    const entity = await this.repository.findOne({
      where: { scopeKey, slug: normalizeCmsSlug(slug) },
    });
    return entity ? toCmsEntrySnapshot(entity) : null;
  }

  async update(id: string, input: UpdateCmsEntryInput): Promise<CmsEntrySnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new CmsEntryNotFoundError();
    }

    if (input.title !== undefined) {
      entity.title = input.title.trim();
    }
    if (input.summary !== undefined) {
      entity.summary = input.summary?.trim() ?? null;
    }
    if (input.body !== undefined) {
      entity.body = input.body;
    }
    if (input.coverMediaAssetId !== undefined) {
      entity.coverMediaAssetId = input.coverMediaAssetId
        ? normalizeUuid(input.coverMediaAssetId)
        : null;
    }
    if (input.isFeatured !== undefined) {
      entity.isFeatured = input.isFeatured;
    }
    if (input.scheduledFor !== undefined) {
      entity.scheduledFor = input.scheduledFor;
    }
    if (input.expiresAt !== undefined) {
      entity.expiresAt = input.expiresAt;
    }
    entity.updatedByUserId = normalizeUuid(input.updatedByUserId);

    const saved = await this.repository.save(entity);
    return toCmsEntrySnapshot(saved);
  }

  async publish(id: string, updatedByUserId: string): Promise<CmsEntrySnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new CmsEntryNotFoundError();
    }
    if (entity.status === CmsEntryStatus.Archived) {
      throw new InvalidCmsTransitionError('Cannot publish an archived CMS entry.');
    }

    entity.status = CmsEntryStatus.Published;
    entity.publishedAt = new Date();
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toCmsEntrySnapshot(saved);
  }

  async archive(id: string, updatedByUserId: string): Promise<CmsEntrySnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new CmsEntryNotFoundError();
    }

    entity.status = CmsEntryStatus.Archived;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toCmsEntrySnapshot(saved);
  }
}
