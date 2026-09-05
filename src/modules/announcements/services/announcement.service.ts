import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  COMMUNICATION_EVENT_TYPES,
  type AnnouncementPublishedEvent,
} from '../../application-events/contracts/communication-events.contract';
import {
  APPLICATION_EVENT_PUBLISHER,
  type ApplicationEventPublisher,
} from '../../application-events/ports/application-event.ports';
import { AnnouncementEntity } from '../entities/announcement.entity';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../enums/announcement.enums';
import {
  AnnouncementNotFoundError,
  InvalidAnnouncementTargetError,
} from '../errors/announcement.errors';
import type {
  AnnouncementAdminListFilter,
  AnnouncementFeedFilter,
  AnnouncementFeedItemSnapshot,
  AnnouncementPaginatedResult,
  AnnouncementSnapshot,
  AnnouncementWithTargetsSnapshot,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '../interfaces/announcement.interfaces';
import {
  assertAnnouncementFieldsEditable,
  assertValidAnnouncementTransition,
  validateAnnouncementTimeWindow,
} from '../utils/announcement-lifecycle.util';
import { AnnouncementTargetService } from './announcement-target.service';
import { AnnouncementUserStateService } from './announcement-user-state.service';

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
    private readonly announcementTargetService: AnnouncementTargetService,
    private readonly announcementUserStateService: AnnouncementUserStateService,
    @Inject(APPLICATION_EVENT_PUBLISHER)
    private readonly eventPublisher: ApplicationEventPublisher,
  ) {}

  async create(input: CreateAnnouncementInput): Promise<AnnouncementWithTargetsSnapshot> {
    const startsAt = input.startsAt ?? new Date();
    validateAnnouncementTimeWindow(startsAt, input.endsAt);

    if (input.targets.length === 0) {
      throw new InvalidAnnouncementTargetError('Announcement must have at least one target.');
    }

    const entity = this.repository.create({
      title: input.title.trim(),
      body: input.body,
      summary: input.summary?.trim() ?? null,
      locale: input.locale ?? 'vi-VN',
      priority: input.priority ?? AnnouncementPriority.Normal,
      status: AnnouncementStatus.Draft,
      scopeType: input.scopeType,
      parishId: input.parishId ? normalizeUuid(input.parishId) : null,
      startsAt,
      endsAt: input.endsAt ?? null,
      isPinned: input.isPinned ?? false,
      coverMediaAssetId: input.coverMediaAssetId ? normalizeUuid(input.coverMediaAssetId) : null,
      publishedAt: null,
      createdByUserId: normalizeUuid(input.authorUserId),
      updatedByUserId: normalizeUuid(input.authorUserId),
    });

    const saved = await this.repository.save(entity);
    const targets = await this.announcementTargetService.replaceTargets(saved.id, input.targets);

    return {
      announcement: toAnnouncementSnapshot(saved),
      targets,
    };
  }

  async getById(id: string): Promise<AnnouncementWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new AnnouncementNotFoundError();
    }

    const targets = await this.announcementTargetService.listTargetsByAnnouncementId(entity.id);
    return {
      announcement: toAnnouncementSnapshot(entity),
      targets,
    };
  }

  async update(
    id: string,
    input: UpdateAnnouncementInput,
  ): Promise<AnnouncementWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new AnnouncementNotFoundError();
    }

    const attemptedFields: string[] = [];
    if (input.title !== undefined) attemptedFields.push('title');
    if (input.body !== undefined) attemptedFields.push('body');
    if (input.summary !== undefined) attemptedFields.push('summary');
    if (input.locale !== undefined) attemptedFields.push('locale');
    if (input.priority !== undefined) attemptedFields.push('priority');
    if (input.scopeType !== undefined) attemptedFields.push('scopeType');
    if (input.parishId !== undefined) attemptedFields.push('parishId');
    if (input.startsAt !== undefined) attemptedFields.push('startsAt');
    if (input.endsAt !== undefined) attemptedFields.push('endsAt');
    if (input.isPinned !== undefined) attemptedFields.push('isPinned');
    if (input.coverMediaAssetId !== undefined) attemptedFields.push('coverMediaAssetId');
    if (input.targets !== undefined) attemptedFields.push('targets');

    assertAnnouncementFieldsEditable(entity.status, attemptedFields);

    const newStartsAt = input.startsAt ?? entity.startsAt;
    const newEndsAt = input.endsAt !== undefined ? input.endsAt : entity.endsAt;
    validateAnnouncementTimeWindow(newStartsAt, newEndsAt);

    if (input.title !== undefined) entity.title = input.title.trim();
    if (input.body !== undefined) entity.body = input.body;
    if (input.summary !== undefined) entity.summary = input.summary?.trim() ?? null;
    if (input.locale !== undefined) entity.locale = input.locale;
    if (input.priority !== undefined) entity.priority = input.priority;
    if (input.startsAt !== undefined) entity.startsAt = input.startsAt;
    if (input.endsAt !== undefined) entity.endsAt = input.endsAt;
    if (input.isPinned !== undefined) entity.isPinned = input.isPinned;
    if (input.coverMediaAssetId !== undefined) {
      entity.coverMediaAssetId = input.coverMediaAssetId
        ? normalizeUuid(input.coverMediaAssetId)
        : null;
    }

    if (entity.status === AnnouncementStatus.Draft) {
      if (input.scopeType !== undefined) entity.scopeType = input.scopeType;
      if (input.parishId !== undefined) {
        entity.parishId = input.parishId ? normalizeUuid(input.parishId) : null;
      }
    }
    entity.updatedByUserId = normalizeUuid(input.updatedByUserId);

    const saved = await this.repository.save(entity);

    let targets: readonly import('../interfaces/announcement.interfaces').AnnouncementTargetSnapshot[];
    if (entity.status === AnnouncementStatus.Draft && input.targets !== undefined) {
      targets = await this.announcementTargetService.replaceTargets(saved.id, input.targets);
    } else {
      targets = await this.announcementTargetService.listTargetsByAnnouncementId(saved.id);
    }

    return {
      announcement: toAnnouncementSnapshot(saved),
      targets,
    };
  }

  async publish(id: string, updatedByUserId: string): Promise<AnnouncementWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new AnnouncementNotFoundError();
    }

    assertValidAnnouncementTransition(entity.status, AnnouncementStatus.Published);

    const targets = await this.announcementTargetService.listTargetsByAnnouncementId(entity.id);
    if (targets.length === 0) {
      throw new InvalidAnnouncementTargetError('Cannot publish an announcement without targets.');
    }

    entity.status = AnnouncementStatus.Published;
    entity.publishedAt = new Date();
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);

    // Emit AnnouncementPublishedEvent post-commit
    const safeSnippet =
      saved.summary ??
      (saved.body.length > 200 ? `${saved.body.slice(0, 197)}...` : saved.body);

    const event: AnnouncementPublishedEvent = {
      applicationEventId: generateUuidV4(),
      operationKey: `ANNOUNCEMENT_PUBLISHED:${saved.id}`,
      eventType: COMMUNICATION_EVENT_TYPES.AnnouncementPublished,
      occurredAt: new Date(),
      announcementId: saved.id,
      title: saved.title,
      snippet: safeSnippet,
      priority: saved.priority,
      targets: targets.map((t) => ({
        targetType: t.targetType,
        parishId: t.parishId,
        classId: t.classId,
        roleCode: t.roleCode,
      })),
      publishedAt: saved.publishedAt,
    };

    await this.eventPublisher.publishCommunicationEvent(event);

    return {
      announcement: toAnnouncementSnapshot(saved),
      targets,
    };
  }

  async archive(id: string, updatedByUserId: string): Promise<AnnouncementWithTargetsSnapshot> {
    const entity = await this.repository.findOne({
      where: { id: normalizeUuid(id) },
    });
    if (!entity) {
      throw new AnnouncementNotFoundError();
    }

    assertValidAnnouncementTransition(entity.status, AnnouncementStatus.Archived);

    entity.status = AnnouncementStatus.Archived;
    entity.updatedByUserId = normalizeUuid(updatedByUserId);

    const saved = await this.repository.save(entity);
    const targets = await this.announcementTargetService.listTargetsByAnnouncementId(saved.id);

    return {
      announcement: toAnnouncementSnapshot(saved),
      targets,
    };
  }

  async findAdminList(
    filter: AnnouncementAdminListFilter,
  ): Promise<AnnouncementPaginatedResult<AnnouncementWithTargetsSnapshot>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('announcement');

    if (filter.isSuperAdmin) {
      if (filter.scopeType) {
        qb.andWhere('announcement.scope_type = :scopeType', { scopeType: filter.scopeType });
      }
      if (filter.parishId) {
        qb.andWhere('announcement.parish_id = :parishId', {
          parishId: normalizeUuid(filter.parishId),
        });
      }
    } else if (filter.isCatechistOnly) {
      if (filter.assignedClassIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      const classUuids = filter.assignedClassIds.map(normalizeUuid);
      qb.innerJoin(
        'announcement_targets',
        'cTarget',
        'cTarget.announcement_id = announcement.id AND cTarget.target_type = :cTargetType AND cTarget.class_id IN (:...classUuids)',
        { cTargetType: CommunicationTargetType.Class, classUuids },
      );
    } else {
      // ParishAdmin
      if (filter.adminParishIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      const parishUuids = filter.adminParishIds.map(normalizeUuid);
      qb.andWhere('announcement.parish_id IN (:...parishUuids)', { parishUuids });
    }

    if (filter.status) {
      qb.andWhere('announcement.status = :status', { status: filter.status });
    }
    if (filter.priority) {
      qb.andWhere('announcement.priority = :priority', { priority: filter.priority });
    }
    if (filter.locale) {
      qb.andWhere('announcement.locale = :locale', { locale: filter.locale.trim() });
    }
    if (filter.search) {
      const searchPattern = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(announcement.title) LIKE :searchPattern OR LOWER(announcement.summary) LIKE :searchPattern)',
        { searchPattern },
      );
    }
    if (filter.targetType) {
      qb.innerJoin(
        'announcement_targets',
        'typeTarget',
        'typeTarget.announcement_id = announcement.id AND typeTarget.target_type = :filterTargetType',
        { filterTargetType: filter.targetType },
      );
    }
    if (filter.classId) {
      const cid = normalizeUuid(filter.classId);
      qb.innerJoin(
        'announcement_targets',
        'classTarget',
        'classTarget.announcement_id = announcement.id AND classTarget.class_id = :filterClassId',
        { filterClassId: cid },
      );
    }

    qb.orderBy('announcement.updated_at', 'DESC');
    qb.addOrderBy('announcement.id', 'DESC');
    qb.skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    const targetMap = await this.announcementTargetService.listTargetsByAnnouncementIds(
      entities.map((e) => e.id),
    );

    const items: AnnouncementWithTargetsSnapshot[] = entities.map((e) => ({
      announcement: toAnnouncementSnapshot(e),
      targets: targetMap.get(e.id) ?? [],
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findUserFeed(
    filter: AnnouncementFeedFilter,
    now = new Date(),
  ): Promise<AnnouncementPaginatedResult<AnnouncementFeedItemSnapshot>> {
    const page = Math.max(1, filter.page);
    const limit = Math.min(50, Math.max(1, filter.limit));
    const skip = (page - 1) * limit;

    if (filter.audienceKeys.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const qb = this.repository.createQueryBuilder('announcement');
    qb.innerJoin(
      'announcement_targets',
      'target',
      'target.announcement_id = announcement.id AND target.target_key IN (:...audienceKeys)',
      { audienceKeys: filter.audienceKeys },
    );
    qb.leftJoin(
      'announcement_user_states',
      'state',
      'state.announcement_id = announcement.id AND state.user_id = :userId',
      { userId: normalizeUuid(filter.userId) },
    );

    qb.where('announcement.status = :publishedStatus', {
      publishedStatus: AnnouncementStatus.Published,
    });
    qb.andWhere('announcement.published_at <= :now', { now });
    qb.andWhere('(announcement.starts_at IS NULL OR announcement.starts_at <= :now)', { now });
    qb.andWhere('(announcement.ends_at IS NULL OR announcement.ends_at > :now)', { now });
    qb.andWhere('(state.dismissed_at IS NULL)');

    if (filter.unreadOnly) {
      qb.andWhere('state.read_at IS NULL');
    }
    if (filter.priority) {
      qb.andWhere('announcement.priority = :priority', { priority: filter.priority });
    }
    if (filter.locale) {
      qb.andWhere('announcement.locale = :locale', { locale: filter.locale.trim() });
    }

    qb.select([
      'announcement.id AS id',
      'announcement.title AS title',
      'announcement.summary AS summary',
      'announcement.body AS body',
      'announcement.locale AS locale',
      'announcement.priority AS priority',
      'announcement.status AS status',
      'announcement.scope_type AS "scopeType"',
      'announcement.parish_id AS "parishId"',
      'announcement.starts_at AS "startsAt"',
      'announcement.ends_at AS "endsAt"',
      'announcement.is_pinned AS "isPinned"',
      'announcement.cover_media_asset_id AS "coverMediaAssetId"',
      'announcement.published_at AS "publishedAt"',
      'announcement.created_by_user_id AS "createdByUserId"',
      'announcement.updated_by_user_id AS "updatedByUserId"',
      'announcement.created_at AS "createdAt"',
      'announcement.updated_at AS "updatedAt"',
      'state.first_seen_at AS "firstSeenAt"',
      'state.read_at AS "readAt"',
    ]);

    qb.distinct(true);

    qb.orderBy('announcement.is_pinned', 'DESC');
    qb.addOrderBy(
      `CASE announcement.priority
         WHEN 'URGENT' THEN 4
         WHEN 'HIGH' THEN 3
         WHEN 'NORMAL' THEN 2
         ELSE 1 END`,
      'DESC',
    );
    qb.addOrderBy('announcement.published_at', 'DESC');
    qb.addOrderBy('announcement.id', 'DESC');

    const total = await qb.getCount();
    qb.offset(skip).limit(limit);
    const rawRows = await qb.getRawMany<{
      id: string;
      title: string;
      summary: string | null;
      body: string;
      locale: string;
      priority: AnnouncementPriority;
      status: AnnouncementStatus;
      scopeType: AnnouncementScopeType;
      parishId: string | null;
      startsAt: Date;
      endsAt: Date | null;
      isPinned: boolean;
      coverMediaAssetId: string | null;
      publishedAt: Date;
      createdByUserId: string;
      updatedByUserId: string;
      createdAt: Date;
      updatedAt: Date;
      firstSeenAt: Date | null;
      readAt: Date | null;
    }>();

    const items: AnnouncementFeedItemSnapshot[] = rawRows.map((row) => ({
      announcement: {
        id: row.id,
        title: row.title,
        body: row.body,
        summary: row.summary,
        locale: row.locale,
        priority: row.priority,
        status: row.status,
        scopeType: row.scopeType,
        parishId: row.parishId,
        startsAt: new Date(row.startsAt),
        endsAt: row.endsAt ? new Date(row.endsAt) : null,
        isPinned: Boolean(row.isPinned),
        coverMediaAssetId: row.coverMediaAssetId,
        publishedAt: row.publishedAt ? new Date(row.publishedAt) : null,
        createdByUserId: row.createdByUserId,
        updatedByUserId: row.updatedByUserId,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      },
      isRead: row.readAt !== null && row.readAt !== undefined,
      firstSeenAt: row.firstSeenAt ? new Date(row.firstSeenAt) : null,
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getUserFeedItemById(
    id: string,
    userId: string,
    audienceKeys: readonly string[],
    now = new Date(),
  ): Promise<AnnouncementFeedItemSnapshot | null> {
    if (audienceKeys.length === 0) {
      return null;
    }

    const aid = normalizeUuid(id);
    const uid = normalizeUuid(userId);

    const qb = this.repository.createQueryBuilder('announcement');
    qb.innerJoin(
      'announcement_targets',
      'target',
      'target.announcement_id = announcement.id AND target.target_key IN (:...audienceKeys)',
      { audienceKeys },
    );
    qb.leftJoin(
      'announcement_user_states',
      'state',
      'state.announcement_id = announcement.id AND state.user_id = :userId',
      { userId: uid },
    );

    qb.where('announcement.id = :id', { id: aid });
    qb.andWhere('announcement.status = :status', { status: AnnouncementStatus.Published });
    qb.andWhere('announcement.published_at <= :now', { now });
    qb.andWhere('(announcement.starts_at IS NULL OR announcement.starts_at <= :now)', { now });
    qb.andWhere('(announcement.ends_at IS NULL OR announcement.ends_at > :now)', { now });
    qb.andWhere('(state.dismissed_at IS NULL)');

    const entity = await qb.getOne();
    if (!entity) {
      return null;
    }

    // Detail view lazily marks read (which also ensures firstSeenAt is set)
    const userState = await this.announcementUserStateService.markRead(entity.id, uid);

    return {
      announcement: toAnnouncementSnapshot(entity),
      isRead: true,
      firstSeenAt: userState.firstSeenAt,
    };
  }
}
