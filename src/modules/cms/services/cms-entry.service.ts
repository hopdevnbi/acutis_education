import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CmsEntryEntity } from '../entities/cms-entry.entity';
import { CmsEntryStatus, CmsScopeType } from '../enums/cms.enums';
import {
  CmsEntryNotFoundError,
  CmsScopeAccessDeniedError,
  CmsSlugConflictError,
  InvalidCmsLifecycleTransitionError,
} from '../errors/cms.errors';
import type {
  AdminCmsListFilter,
  CmsEntrySnapshot,
  CmsPaginatedResult,
  CmsScheduledPublishResult,
  CreateCmsEntryInput,
  PublicCmsListFilter,
  UpdateCmsEntryInput,
} from '../interfaces/cms.interfaces';
import {
  assertValidCmsSlug,
  buildCmsScopeKey,
  normalizeCmsSlug,
} from '../utils/cms-key.util';
import {
  assertFieldsEditable,
  assertValidCmsTransition,
  validateCmsScheduleDates,
} from '../utils/cms-lifecycle.util';

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
    assertValidCmsSlug(input.slug);
    const slug = normalizeCmsSlug(input.slug);

    validateCmsScheduleDates({
      scheduledFor: input.scheduledFor,
      expiresAt: input.expiresAt,
    });

    const scopeKey = buildCmsScopeKey({
      scopeType: input.scopeType,
      parishId: input.parishId,
    });

    const existing = await this.repository.findOne({
      where: { scopeKey, slug },
    });
    if (existing) {
      throw new CmsSlugConflictError(
        `A CMS entry with slug '${slug}' already exists in scope '${scopeKey}'.`,
      );
    }

    const initialStatus = input.scheduledFor
      ? CmsEntryStatus.Scheduled
      : CmsEntryStatus.Draft;

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
      status: initialStatus,
      coverMediaAssetId: input.coverMediaAssetId ? normalizeUuid(input.coverMediaAssetId) : null,
      isFeatured: input.isFeatured ?? false,
      scheduledFor: input.scheduledFor ?? null,
      publishedAt: null,
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

  async update(id: string, input: UpdateCmsEntryInput): Promise<CmsEntrySnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new CmsEntryNotFoundError();
    }

    const attemptedFieldNames: string[] = [];
    if (input.slug !== undefined && input.slug !== entity.slug) attemptedFieldNames.push('slug');
    if (input.type !== undefined && input.type !== entity.type) attemptedFieldNames.push('type');
    if (input.scopeType !== undefined && input.scopeType !== entity.scopeType) attemptedFieldNames.push('scopeType');
    if (input.parishId !== undefined && input.parishId !== entity.parishId) attemptedFieldNames.push('parishId');
    if (input.title !== undefined) attemptedFieldNames.push('title');
    if (input.summary !== undefined) attemptedFieldNames.push('summary');
    if (input.body !== undefined) attemptedFieldNames.push('body');
    if (input.locale !== undefined) attemptedFieldNames.push('locale');
    if (input.coverMediaAssetId !== undefined) attemptedFieldNames.push('coverMediaAssetId');
    if (input.isFeatured !== undefined) attemptedFieldNames.push('isFeatured');
    if (input.scheduledFor !== undefined) attemptedFieldNames.push('scheduledFor');
    if (input.expiresAt !== undefined) attemptedFieldNames.push('expiresAt');

    assertFieldsEditable(entity.status, attemptedFieldNames);

    let newScopeType = entity.scopeType;
    let newParishId = entity.parishId;
    let newSlug = entity.slug;

    if (input.scopeType !== undefined) {
      newScopeType = input.scopeType;
    }
    if (input.parishId !== undefined) {
      newParishId = input.parishId ? normalizeUuid(input.parishId) : null;
    }
    if (input.slug !== undefined) {
      assertValidCmsSlug(input.slug);
      newSlug = normalizeCmsSlug(input.slug);
    }

    const newScopeKey = buildCmsScopeKey({
      scopeType: newScopeType,
      parishId: newParishId,
    });

    if (newScopeKey !== entity.scopeKey || newSlug !== entity.slug) {
      const conflict = await this.repository.findOne({
        where: { scopeKey: newScopeKey, slug: newSlug },
      });
      if (conflict && conflict.id !== entity.id) {
        throw new CmsSlugConflictError(
          `A CMS entry with slug '${newSlug}' already exists in scope '${newScopeKey}'.`,
        );
      }
    }

    if (input.scheduledFor !== undefined) {
      validateCmsScheduleDates({
        scheduledFor: input.scheduledFor,
        expiresAt: input.expiresAt ?? entity.expiresAt,
        publishedAt: entity.publishedAt,
      });

      if (input.scheduledFor === null) {
        if (entity.status === CmsEntryStatus.Scheduled) {
          entity.status = CmsEntryStatus.Draft;
        }
        entity.scheduledFor = null;
      } else {
        if (entity.status === CmsEntryStatus.Draft) {
          entity.status = CmsEntryStatus.Scheduled;
        }
        entity.scheduledFor = input.scheduledFor;
      }
    } else if (input.expiresAt !== undefined) {
      validateCmsScheduleDates({
        scheduledFor: entity.scheduledFor,
        expiresAt: input.expiresAt,
        publishedAt: entity.publishedAt,
      });
    }

    entity.scopeType = newScopeType;
    entity.scopeKey = newScopeKey;
    entity.parishId = newParishId;
    entity.slug = newSlug;

    if (input.type !== undefined) entity.type = input.type;
    if (input.title !== undefined) entity.title = input.title.trim();
    if (input.summary !== undefined) entity.summary = input.summary?.trim() ?? null;
    if (input.body !== undefined) entity.body = input.body;
    if (input.locale !== undefined) entity.locale = input.locale;
    if (input.coverMediaAssetId !== undefined) {
      entity.coverMediaAssetId = input.coverMediaAssetId
        ? normalizeUuid(input.coverMediaAssetId)
        : null;
    }
    if (input.isFeatured !== undefined) entity.isFeatured = input.isFeatured;
    if (input.expiresAt !== undefined) entity.expiresAt = input.expiresAt;
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

    if (entity.status === CmsEntryStatus.Published) {
      throw new InvalidCmsLifecycleTransitionError('CMS entry is already published.');
    }
    if (entity.status === CmsEntryStatus.Archived) {
      throw new InvalidCmsLifecycleTransitionError('Cannot publish an archived CMS entry.');
    }

    assertValidCmsTransition(entity.status, CmsEntryStatus.Published);

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

    if (entity.status === CmsEntryStatus.Archived) {
      throw new InvalidCmsLifecycleTransitionError('CMS entry is already archived.');
    }

    assertValidCmsTransition(entity.status, CmsEntryStatus.Archived);

    entity.status = CmsEntryStatus.Archived;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    return toCmsEntrySnapshot(saved);
  }

  async findPublicList(
    filter: PublicCmsListFilter,
    now = new Date(),
  ): Promise<CmsPaginatedResult<CmsEntrySnapshot>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('entry');
    qb.where('entry.status = :status', { status: CmsEntryStatus.Published });
    qb.andWhere('entry.published_at <= :now', { now });
    qb.andWhere('(entry.expires_at IS NULL OR entry.expires_at > :now)', { now });

    if (filter.parishId) {
      const normalizedParishId = normalizeUuid(filter.parishId);
      const isAllowed = filter.allowedParishIds
        .map((p) => p.toLowerCase())
        .includes(normalizedParishId);

      if (!isAllowed) {
        return { items: [], total: 0, page, limit };
      }
      qb.andWhere('entry.scope_key = :scopeKey', { scopeKey: `PARISH:${normalizedParishId}` });
    } else {
      if (filter.allowedParishIds.length === 0) {
        qb.andWhere('entry.scope_key = :globalScope', { globalScope: 'GLOBAL' });
      } else {
        const allowedScopeKeys = [
          'GLOBAL',
          ...filter.allowedParishIds.map((p) => `PARISH:${p.toLowerCase()}`),
        ];
        qb.andWhere('entry.scope_key IN (:...allowedScopeKeys)', { allowedScopeKeys });
      }
    }

    if (filter.type) {
      qb.andWhere('entry.type = :type', { type: filter.type });
    }
    if (filter.locale) {
      qb.andWhere('entry.locale = :locale', { locale: filter.locale.trim() });
    }
    if (filter.isFeatured !== undefined) {
      qb.andWhere('entry.is_featured = :isFeatured', { isFeatured: filter.isFeatured ? 1 : 0 });
    }

    qb.orderBy('entry.is_featured', 'DESC');
    qb.addOrderBy('entry.published_at', 'DESC');
    qb.addOrderBy('entry.id', 'DESC');
    qb.skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    return {
      items: entities.map(toCmsEntrySnapshot),
      total,
      page,
      limit,
    };
  }

  async findPublicBySlug(
    slug: string,
    options: {
      readonly parishId?: string;
      readonly allowedParishIds: readonly string[];
      readonly now?: Date;
    },
  ): Promise<CmsEntrySnapshot | null> {
    const normalizedSlug = normalizeCmsSlug(slug);
    const now = options.now ?? new Date();

    let targetScopeKey = 'GLOBAL';

    if (options.parishId) {
      const normalizedParishId = normalizeUuid(options.parishId);
      const isAllowed = options.allowedParishIds
        .map((p) => p.toLowerCase())
        .includes(normalizedParishId);

      if (!isAllowed) {
        return null;
      }
      targetScopeKey = `PARISH:${normalizedParishId}`;
    }

    const qb = this.repository.createQueryBuilder('entry');
    qb.where('entry.scope_key = :targetScopeKey', { targetScopeKey });
    qb.andWhere('entry.slug = :slug', { slug: normalizedSlug });
    qb.andWhere('entry.status = :status', { status: CmsEntryStatus.Published });
    qb.andWhere('entry.published_at <= :now', { now });
    qb.andWhere('(entry.expires_at IS NULL OR entry.expires_at > :now)', { now });

    const entity = await qb.getOne();
    return entity ? toCmsEntrySnapshot(entity) : null;
  }

  async findAdminList(
    filter: AdminCmsListFilter,
  ): Promise<CmsPaginatedResult<CmsEntrySnapshot>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('entry');

    if (!filter.isSuperAdmin) {
      if (filter.scopeType === CmsScopeType.Global) {
        throw new CmsScopeAccessDeniedError('Parish administrators cannot manage global CMS entries.');
      }

      if (filter.parishId) {
        const normalizedRequested = normalizeUuid(filter.parishId);
        const hasAccess = filter.adminParishIds
          .map((id) => id.toLowerCase())
          .includes(normalizedRequested);
        if (!hasAccess) {
          throw new CmsScopeAccessDeniedError('Not authorized to access entries for this parish.');
        }
        qb.andWhere('entry.scope_key = :parishKey', {
          parishKey: `PARISH:${normalizedRequested}`,
        });
      } else {
        if (filter.adminParishIds.length === 0) {
          return { items: [], total: 0, page, limit };
        }
        const parishScopeKeys = filter.adminParishIds.map(
          (id) => `PARISH:${id.toLowerCase()}`,
        );
        qb.andWhere('entry.scope_key IN (:...parishScopeKeys)', { parishScopeKeys });
      }
    } else {
      if (filter.scopeType) {
        qb.andWhere('entry.scope_type = :scopeType', { scopeType: filter.scopeType });
      }
      if (filter.parishId) {
        qb.andWhere('entry.parish_id = :parishId', {
          parishId: normalizeUuid(filter.parishId),
        });
      }
    }

    if (filter.status) {
      qb.andWhere('entry.status = :status', { status: filter.status });
    }
    if (filter.type) {
      qb.andWhere('entry.type = :type', { type: filter.type });
    }
    if (filter.locale) {
      qb.andWhere('entry.locale = :locale', { locale: filter.locale.trim() });
    }
    if (filter.search) {
      const pattern = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(entry.title) LIKE :pattern OR LOWER(entry.slug) LIKE :pattern)', {
        pattern,
      });
    }

    qb.orderBy('entry.updated_at', 'DESC');
    qb.addOrderBy('entry.id', 'DESC');
    qb.skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    return {
      items: entities.map(toCmsEntrySnapshot),
      total,
      page,
      limit,
    };
  }

  async getAdminById(
    id: string,
    actor: { readonly isSuperAdmin: boolean; readonly adminParishIds: readonly string[] },
  ): Promise<CmsEntrySnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new CmsEntryNotFoundError();
    }

    if (!actor.isSuperAdmin) {
      if (entity.scopeType === CmsScopeType.Global) {
        throw new CmsScopeAccessDeniedError(
          'Parish administrators cannot manage global CMS entries.',
        );
      }
      if (!entity.parishId) {
        throw new CmsScopeAccessDeniedError('Invalid parish entry without parish ID.');
      }
      const hasAccess = actor.adminParishIds
        .map((p) => p.toLowerCase())
        .includes(entity.parishId.toLowerCase());
      if (!hasAccess) {
        throw new CmsScopeAccessDeniedError('Not authorized to access entries for this parish.');
      }
    }

    return toCmsEntrySnapshot(entity);
  }

  async publishDueEntries(now = new Date()): Promise<CmsScheduledPublishResult> {
    const dueEntries = await this.repository.find({
      where: {
        status: CmsEntryStatus.Scheduled,
        scheduledFor: LessThanOrEqual(now),
      },
      take: 100,
      order: { scheduledFor: 'ASC' },
    });

    if (dueEntries.length === 0) {
      return { processedCount: 0, publishedEntryIds: [] };
    }

    for (const entry of dueEntries) {
      entry.status = CmsEntryStatus.Published;
      entry.publishedAt = entry.scheduledFor ?? now;
    }

    const saved = await this.repository.save(dueEntries);
    return {
      processedCount: saved.length,
      publishedEntryIds: saved.map((e) => e.id),
    };
  }
}
