import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseLocale } from '../../../common/locale';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  LOCALIZATION_LIST_DEFAULT_LIMIT,
  LOCALIZATION_LIST_DEFAULT_PAGE,
  LOCALIZATION_LIST_MAX_LIMIT,
  LOCALIZATION_STATUS_FILTER_MAX_SCAN,
} from '../constants/localization-admin.constants';
import { TranslationResourceEntity } from '../entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../entities/translation-revision.entity';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import {
  deriveAdminTranslationEffectiveStatus,
  isAdminTranslationEffectiveStatus,
} from '../enums/admin-translation-effective-status.enum';
import {
  InvalidTranslationResourceIdError,
  InvalidTranslationResourceTypeError,
  TranslationResourceBindingConflictError,
  TranslationResourceNotFoundError,
} from '../errors/localization.errors';
import { LocalizationStatusFilterScanLimitExceededError } from '../errors/localization-admin.errors';
import type {
  GetOrCreateTranslationResourceInput,
  TranslationResourceListFilter,
  TranslationResourceListItem,
  TranslationResourceListResult,
  TranslationResourceRef,
  TranslationResourceSnapshot,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import {
  toTranslationResourceSnapshot,
  toTranslationRevisionSnapshot,
} from '../mappers/localization.mapper';
import { normalizeOptionalUuid } from '../utils/localization-validation.util';

@Injectable()
export class TranslationResourceService {
  constructor(
    @InjectRepository(TranslationResourceEntity)
    private readonly translationResourceRepository: Repository<TranslationResourceEntity>,
    @InjectRepository(TranslationRevisionEntity)
    private readonly translationRevisionRepository: Repository<TranslationRevisionEntity>,
  ) {}

  async getOrCreateResource(
    input: GetOrCreateTranslationResourceInput,
  ): Promise<TranslationResourceSnapshot> {
    this.assertResourceType(input.resourceType);
    const resourceId = this.parseResourceId(input.resourceId);
    const parishId = normalizeOptionalUuid(input.parishId);
    const sourceLocale = parseLocale(input.sourceLocale);

    const existing = await this.translationResourceRepository.findOne({
      where: {
        resourceType: input.resourceType,
        resourceId,
      },
    });

    if (existing !== null) {
      this.assertBindingCompatible(existing, parishId, sourceLocale);

      return toTranslationResourceSnapshot(existing);
    }

    const created = this.translationResourceRepository.create({
      resourceType: input.resourceType,
      resourceId,
      parishId,
      sourceLocale,
    });

    const saved = await this.translationResourceRepository.save(created);

    return toTranslationResourceSnapshot(saved);
  }

  async getResourceByRef(ref: TranslationResourceRef): Promise<TranslationResourceSnapshot> {
    const resource = await this.findResourceEntityByRef(ref);

    if (resource === null) {
      throw new TranslationResourceNotFoundError();
    }

    return toTranslationResourceSnapshot(resource);
  }

  async findResourceByRef(
    ref: TranslationResourceRef,
  ): Promise<TranslationResourceSnapshot | null> {
    const resource = await this.findResourceEntityByRef(ref);

    if (resource === null) {
      return null;
    }

    return toTranslationResourceSnapshot(resource);
  }

  async findResourcesByRefs(
    refs: readonly TranslationResourceRef[],
  ): Promise<Map<string, TranslationResourceSnapshot>> {
    const normalizedRefs = refs.map((ref) => ({
      resourceType: ref.resourceType,
      resourceId: this.parseResourceId(ref.resourceId),
    }));
    const uniqueRefs = new Map<string, TranslationResourceRef>();

    for (const ref of normalizedRefs) {
      uniqueRefs.set(`${ref.resourceType}:${ref.resourceId}`, ref);
    }

    if (uniqueRefs.size === 0) {
      return new Map();
    }

    const resources = await this.translationResourceRepository
      .createQueryBuilder('resource')
      .where(
        normalizedRefs
          .map(
            (_ref, index) =>
              `(resource.resourceType = :resourceType${index} AND resource.resourceId = :resourceId${index})`,
          )
          .join(' OR '),
        Object.fromEntries(
          normalizedRefs.flatMap((ref, index) => [
            [`resourceType${index}`, ref.resourceType],
            [`resourceId${index}`, ref.resourceId],
          ]),
        ),
      )
      .getMany();

    const result = new Map<string, TranslationResourceSnapshot>();

    for (const resource of resources) {
      result.set(
        `${resource.resourceType}:${normalizeUuid(resource.resourceId)}`,
        toTranslationResourceSnapshot(resource),
      );
    }

    return result;
  }

  async getResourceById(translationResourceId: string): Promise<TranslationResourceSnapshot> {
    if (!isUuidV4(translationResourceId)) {
      throw new TranslationResourceNotFoundError();
    }

    const resource = await this.translationResourceRepository.findOne({
      where: { id: normalizeUuid(translationResourceId) },
    });

    if (resource === null) {
      throw new TranslationResourceNotFoundError();
    }

    return toTranslationResourceSnapshot(resource);
  }

  async listAllCandidates(
    filter: TranslationResourceListFilter,
  ): Promise<readonly TranslationResourceListItem[]> {
    const resources = await this.buildListQuery(filter).getMany();

    if (resources.length > LOCALIZATION_STATUS_FILTER_MAX_SCAN) {
      throw new LocalizationStatusFilterScanLimitExceededError();
    }

    return this.buildListItems(resources, filter.targetLocale, undefined);
  }

  applySourceHashesToListResult(
    result: TranslationResourceListResult,
    sourceHashes: ReadonlyMap<string, string>,
    targetLocale: string | undefined,
  ): TranslationResourceListResult {
    const normalizedTargetLocale = targetLocale === undefined ? null : parseLocale(targetLocale);

    return {
      ...result,
      items: result.items.map((item) => {
        const currentSourceContentHash = sourceHashes.get(normalizeUuid(item.id)) ?? null;
        const effectiveStatus =
          normalizedTargetLocale === null || currentSourceContentHash === null
            ? item.effectiveStatus
            : deriveAdminTranslationEffectiveStatus({
                revision:
                  item.latestRevisionStatus === null ||
                  item.latestRevisionSourceContentHash === null
                    ? null
                    : {
                        id: item.latestRevisionId ?? '',
                        translationResourceId: item.id,
                        targetLocale: normalizedTargetLocale,
                        revisionNumber: item.latestRevisionNumber ?? 0,
                        sourceContentHash: item.latestRevisionSourceContentHash,
                        sourceVersionKey: null,
                        status: item.latestRevisionStatus as TranslationRevisionSnapshot['status'],
                        payloadJson: '{}',
                        providerId: null,
                        providerModel: null,
                        glossaryVersionId: null,
                        createdByUserId: null,
                        approvedByUserId: null,
                        createdAt: item.createdAt,
                        approvedAt: null,
                      },
                currentSourceContentHash,
              });

        return {
          ...item,
          targetLocale: normalizedTargetLocale,
          currentSourceContentHash,
          effectiveStatus,
        };
      }),
    };
  }

  paginateStatusFilteredList(
    filter: TranslationResourceListFilter,
    candidates: readonly TranslationResourceListItem[],
    sourceHashes: ReadonlyMap<string, string>,
  ): TranslationResourceListResult {
    const page = Math.max(LOCALIZATION_LIST_DEFAULT_PAGE, filter.page);
    const limit = Math.min(
      LOCALIZATION_LIST_MAX_LIMIT,
      Math.max(1, filter.limit ?? LOCALIZATION_LIST_DEFAULT_LIMIT),
    );
    const offset = (page - 1) * limit;
    const enriched = this.applySourceHashesToListResult(
      { items: [...candidates], page, limit, total: candidates.length },
      sourceHashes,
      filter.targetLocale,
    );
    const statusFilter = filter.translationStatus;

    if (statusFilter === undefined || !isAdminTranslationEffectiveStatus(statusFilter)) {
      return {
        items: enriched.items.slice(offset, offset + limit),
        page,
        limit,
        total: enriched.items.length,
      };
    }

    const filtered = enriched.items.filter((item) => item.effectiveStatus === statusFilter);

    return {
      items: filtered.slice(offset, offset + limit),
      page,
      limit,
      total: filtered.length,
    };
  }

  async listResources(
    filter: TranslationResourceListFilter,
    currentSourceHashes?: ReadonlyMap<string, string>,
  ): Promise<TranslationResourceListResult> {
    const page = Math.max(LOCALIZATION_LIST_DEFAULT_PAGE, filter.page);
    const limit = Math.min(
      LOCALIZATION_LIST_MAX_LIMIT,
      Math.max(1, filter.limit ?? LOCALIZATION_LIST_DEFAULT_LIMIT),
    );
    const offset = (page - 1) * limit;
    const queryBuilder = this.buildListQuery(filter);
    const total = await queryBuilder.getCount();
    const resources = await queryBuilder.skip(offset).take(limit).getMany();
    const items = await this.buildListItems(resources, filter.targetLocale, currentSourceHashes);

    return {
      items,
      page,
      limit,
      total,
    };
  }

  private buildListQuery(
    filter: TranslationResourceListFilter,
  ): ReturnType<Repository<TranslationResourceEntity>['createQueryBuilder']> {
    const queryBuilder = this.translationResourceRepository
      .createQueryBuilder('resource')
      .orderBy('resource.updatedAt', 'DESC');

    if (filter.resourceType !== undefined) {
      this.assertResourceType(filter.resourceType as TranslationResourceType);
      queryBuilder.andWhere('resource.resourceType = :resourceType', {
        resourceType: filter.resourceType,
      });
    }

    if (filter.sourceLocale !== undefined) {
      queryBuilder.andWhere('resource.sourceLocale = :sourceLocale', {
        sourceLocale: parseLocale(filter.sourceLocale),
      });
    }

    if (filter.parishIds !== null && filter.parishIds !== undefined) {
      if (filter.parishIds.length === 0) {
        queryBuilder.andWhere('1 = 0');
      } else {
        queryBuilder.andWhere('resource.parishId IN (:...parishIds)', {
          parishIds: filter.parishIds.map((parishId) => normalizeUuid(parishId)),
        });
      }
    }

    return queryBuilder;
  }

  private async buildListItems(
    resources: readonly TranslationResourceEntity[],
    targetLocale: string | undefined,
    currentSourceHashes: ReadonlyMap<string, string> | undefined,
  ): Promise<TranslationResourceListItem[]> {
    const normalizedTargetLocale = targetLocale === undefined ? null : parseLocale(targetLocale);

    if (normalizedTargetLocale !== null && resources.length > 0) {
      const resourceIds = resources.map((resource) => normalizeUuid(resource.id));

      return this.buildListItemsWithRevisions(
        resources,
        normalizedTargetLocale,
        resourceIds,
        currentSourceHashes,
      );
    }

    return resources.map((resource) => ({
      id: normalizeUuid(resource.id),
      resourceType: resource.resourceType,
      resourceId: normalizeUuid(resource.resourceId),
      parishId: resource.parishId === null ? null : normalizeUuid(resource.parishId),
      sourceLocale: resource.sourceLocale,
      targetLocale: normalizedTargetLocale,
      effectiveStatus: null,
      currentSourceContentHash: currentSourceHashes?.get(normalizeUuid(resource.id)) ?? null,
      latestRevisionId: null,
      latestRevisionStatus: null,
      latestRevisionNumber: null,
      latestRevisionSourceContentHash: null,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    }));
  }

  private async buildListItemsWithRevisions(
    resources: readonly TranslationResourceEntity[],
    normalizedTargetLocale: string,
    resourceIds: readonly string[],
    currentSourceHashes: ReadonlyMap<string, string> | undefined,
  ): Promise<TranslationResourceListItem[]> {
    const revisions = await this.translationRevisionRepository
      .createQueryBuilder('revision')
      .where('revision.translationResourceId IN (:...resourceIds)', { resourceIds })
      .andWhere('revision.targetLocale = :targetLocale', { targetLocale: normalizedTargetLocale })
      .orderBy('revision.revisionNumber', 'DESC')
      .getMany();
    const latestRevisionByResourceId = new Map<string, TranslationRevisionEntity>();

    for (const revision of revisions) {
      const resourceId = normalizeUuid(revision.translationResourceId);

      if (!latestRevisionByResourceId.has(resourceId)) {
        latestRevisionByResourceId.set(resourceId, revision);
      }
    }

    const items: TranslationResourceListItem[] = [];

    for (const resource of resources) {
      const resourceId = normalizeUuid(resource.id);
      const latestRevision = latestRevisionByResourceId.get(resourceId) ?? null;
      const currentSourceContentHash = currentSourceHashes?.get(resourceId) ?? null;
      const effectiveStatus =
        currentSourceContentHash === null
          ? null
          : deriveAdminTranslationEffectiveStatus({
              revision:
                latestRevision === null ? null : toTranslationRevisionSnapshot(latestRevision),
              currentSourceContentHash,
            });

      items.push({
        id: resourceId,
        resourceType: resource.resourceType,
        resourceId: normalizeUuid(resource.resourceId),
        parishId: resource.parishId === null ? null : normalizeUuid(resource.parishId),
        sourceLocale: resource.sourceLocale,
        targetLocale: normalizedTargetLocale,
        effectiveStatus,
        currentSourceContentHash,
        latestRevisionId: latestRevision === null ? null : normalizeUuid(latestRevision.id),
        latestRevisionStatus: latestRevision?.status ?? null,
        latestRevisionNumber: latestRevision?.revisionNumber ?? null,
        latestRevisionSourceContentHash: latestRevision?.sourceContentHash ?? null,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      });
    }

    return items;
  }

  private assertResourceType(resourceType: TranslationResourceType): void {
    if (!Object.values(TranslationResourceType).includes(resourceType)) {
      throw new InvalidTranslationResourceTypeError();
    }
  }

  private parseResourceId(rawResourceId: string): string {
    if (!isUuidV4(rawResourceId)) {
      throw new InvalidTranslationResourceIdError();
    }

    return normalizeUuid(rawResourceId);
  }

  private async findResourceEntityByRef(
    ref: TranslationResourceRef,
  ): Promise<TranslationResourceEntity | null> {
    this.assertResourceType(ref.resourceType);
    const resourceId = this.parseResourceId(ref.resourceId);

    return this.translationResourceRepository.findOne({
      where: {
        resourceType: ref.resourceType,
        resourceId,
      },
    });
  }

  private assertBindingCompatible(
    existing: TranslationResourceEntity,
    parishId: string | null,
    sourceLocale: string,
  ): void {
    const existingParishId = existing.parishId === null ? null : normalizeUuid(existing.parishId);

    if (existingParishId !== parishId || existing.sourceLocale !== sourceLocale) {
      throw new TranslationResourceBindingConflictError();
    }
  }
}
