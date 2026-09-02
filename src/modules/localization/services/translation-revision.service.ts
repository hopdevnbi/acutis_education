import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { parseLocale } from '../../../common/locale';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { TranslationResourceEntity } from '../entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../entities/translation-revision.entity';
import { deriveAdminTranslationEffectiveStatus } from '../enums/admin-translation-effective-status.enum';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';
import {
  LocalizationRevisionNotApprovableError,
  LocalizationRevisionStaleError,
} from '../errors/localization-admin.errors';
import {
  TranslationResourceNotFoundError,
  TranslationRevisionNotFoundError,
  UnsupportedTranslationResourceError,
} from '../errors/localization.errors';
import type {
  CreateTranslationRevisionInput,
  LatestApprovedTranslationRevisionResult,
  TranslationResourceSnapshot,
  TranslationRevisionDetail,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import type { TranslationSourceSnapshot } from '../interfaces/translation-source-adapter.interface';
import {
  toTranslationResourceSnapshot,
  toTranslationRevisionSnapshot,
} from '../mappers/localization.mapper';
import { deriveTranslationReadStatus } from '../utils/derive-translation-read-status.util';
import {
  assertApprovedRevisionMetadata,
  assertPersistedRevisionStatus,
  assertSourceContentHash,
  assertTargetLocale,
  assertTranslationPayload,
  normalizeOptionalUuid,
} from '../utils/localization-validation.util';
import { parseTranslationPayloadJson } from '../utils/parse-translation-payload.util';
import { validateTranslationPayloadWithAdapter } from '../utils/validate-translation-payload-with-adapter.util';
import { TranslationSourceRegistryService } from './translation-source-registry.service';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class TranslationRevisionService {
  constructor(
    @InjectRepository(TranslationRevisionEntity)
    private readonly translationRevisionRepository: Repository<TranslationRevisionEntity>,
    @InjectRepository(TranslationResourceEntity)
    private readonly translationResourceRepository: Repository<TranslationResourceEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly translationSourceRegistryService: TranslationSourceRegistryService,
  ) {}

  async createRevision(
    input: CreateTranslationRevisionInput,
  ): Promise<TranslationRevisionSnapshot> {
    const translationResourceId = this.parseTranslationResourceId(input.translationResourceId);
    const resource = await this.findResourceById(translationResourceId);
    const targetLocale = assertTargetLocale(input.targetLocale, resource.sourceLocale);
    const sourceContentHash = assertSourceContentHash(input.sourceContentHash);
    const payloadJson = assertTranslationPayload(input.payload);

    assertPersistedRevisionStatus(input.status);
    assertApprovedRevisionMetadata({
      status: input.status,
      approvedByUserId: input.approvedByUserId,
      approvedAt: input.approvedAt,
    });

    return this.dataSource.transaction(async (entityManager) => {
      const revisionRepository = entityManager.getRepository(TranslationRevisionEntity);
      const maxRevisionRow = await revisionRepository
        .createQueryBuilder('revision')
        .select('MAX(revision.revisionNumber)', 'maxRevisionNumber')
        .where('revision.translationResourceId = :translationResourceId', { translationResourceId })
        .andWhere('revision.targetLocale = :targetLocale', { targetLocale })
        .getRawOne<{ maxRevisionNumber: number | null }>();

      const nextRevisionNumber = (maxRevisionRow?.maxRevisionNumber ?? 0) + 1;
      const revision = revisionRepository.create({
        translationResourceId,
        targetLocale,
        revisionNumber: nextRevisionNumber,
        sourceContentHash,
        sourceVersionKey: input.sourceVersionKey ?? null,
        status: input.status,
        payloadJson,
        providerId: input.providerId ?? null,
        providerModel: input.providerModel ?? null,
        glossaryVersionId: normalizeOptionalUuid(input.glossaryVersionId),
        createdByUserId: normalizeOptionalUuid(input.createdByUserId),
        approvedByUserId: normalizeOptionalUuid(input.approvedByUserId),
        approvedAt: input.approvedAt ?? null,
      });

      try {
        const savedRevision = await revisionRepository.save(revision);

        return toTranslationRevisionSnapshot(savedRevision);
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error)) {
          return this.createRevisionWithRetry(
            revisionRepository,
            translationResourceId,
            targetLocale,
            sourceContentHash,
            input,
            payloadJson,
          );
        }

        throw error;
      }
    });
  }

  async getLatestRevision(
    translationResourceId: string,
    targetLocale: string,
  ): Promise<TranslationRevisionSnapshot | null> {
    const normalizedResourceId = this.parseTranslationResourceId(translationResourceId);
    const resource = await this.findResourceById(normalizedResourceId);
    const normalizedTargetLocale = assertTargetLocale(targetLocale, resource.sourceLocale);

    const revision = await this.translationRevisionRepository.findOne({
      where: {
        translationResourceId: normalizedResourceId,
        targetLocale: normalizedTargetLocale,
      },
      order: {
        revisionNumber: 'DESC',
      },
    });

    if (revision === null) {
      return null;
    }

    return toTranslationRevisionSnapshot(revision);
  }

  async getLatestApprovedRevision(input: {
    readonly translationResourceId: string;
    readonly targetLocale: string;
    readonly currentSourceContentHash: string;
  }): Promise<LatestApprovedTranslationRevisionResult> {
    const normalizedResourceId = this.parseTranslationResourceId(input.translationResourceId);
    const resource = await this.findResourceById(normalizedResourceId);
    const normalizedTargetLocale = assertTargetLocale(input.targetLocale, resource.sourceLocale);
    const currentSourceContentHash = assertSourceContentHash(input.currentSourceContentHash);

    const revision = await this.translationRevisionRepository.findOne({
      where: {
        translationResourceId: normalizedResourceId,
        targetLocale: normalizedTargetLocale,
        status: TranslationRevisionStatus.Approved,
      },
      order: {
        revisionNumber: 'DESC',
      },
    });

    const snapshot = revision === null ? null : toTranslationRevisionSnapshot(revision);

    return deriveTranslationReadStatus({
      revision: snapshot,
      currentSourceContentHash,
      sourceLocale: resource.sourceLocale,
      targetLocale: normalizedTargetLocale,
    });
  }

  async getRevisionById(revisionId: string): Promise<TranslationRevisionSnapshot> {
    if (!isUuidV4(revisionId)) {
      throw new TranslationRevisionNotFoundError();
    }

    const revision = await this.translationRevisionRepository.findOne({
      where: { id: normalizeUuid(revisionId) },
    });

    if (revision === null) {
      throw new TranslationRevisionNotFoundError();
    }

    return toTranslationRevisionSnapshot(revision);
  }

  async getRevisionDetail(revisionId: string): Promise<TranslationRevisionDetail> {
    const revision = await this.getRevisionById(revisionId);
    const resource = await this.findResourceById(revision.translationResourceId);
    const resourceSnapshot = toTranslationResourceSnapshot(resource);
    const payload = parseTranslationPayloadJson(revision.payloadJson);
    const sourceSnapshot = await this.resolveSourceSnapshot(resourceSnapshot);
    const currentSourceContentHash = sourceSnapshot?.sourceContentHash ?? null;
    const effectiveStatus = deriveAdminTranslationEffectiveStatus({
      revision,
      currentSourceContentHash: currentSourceContentHash ?? revision.sourceContentHash,
    });
    const isStale =
      currentSourceContentHash !== null && revision.sourceContentHash !== currentSourceContentHash;

    return {
      revision,
      resource: resourceSnapshot,
      payload,
      effectiveStatus,
      isStale,
      currentSourceContentHash,
    };
  }

  async createReviewedRevisionFromRevision(input: {
    readonly revisionId: string;
    readonly payload: Record<string, unknown>;
    readonly createdByUserId?: string | null;
  }): Promise<TranslationRevisionSnapshot> {
    const baseRevision = await this.getRevisionById(input.revisionId);
    const resource = await this.findResourceById(baseRevision.translationResourceId);
    const resourceSnapshot = toTranslationResourceSnapshot(resource);
    const sourceSnapshot = await this.requireSourceSnapshot(resourceSnapshot);

    if (
      baseRevision.status !== TranslationRevisionStatus.MachineTranslated &&
      baseRevision.status !== TranslationRevisionStatus.Reviewed
    ) {
      throw new LocalizationRevisionNotApprovableError();
    }

    assertTranslationPayload(input.payload);

    const adapter = this.translationSourceRegistryService.getAdapter(resource.resourceType);
    validateTranslationPayloadWithAdapter(adapter, sourceSnapshot, input.payload);

    return this.createRevision({
      translationResourceId: baseRevision.translationResourceId,
      targetLocale: baseRevision.targetLocale,
      sourceContentHash: baseRevision.sourceContentHash,
      sourceVersionKey: baseRevision.sourceVersionKey,
      status: TranslationRevisionStatus.Reviewed,
      payload: input.payload,
      providerId: baseRevision.providerId,
      providerModel: baseRevision.providerModel,
      glossaryVersionId: baseRevision.glossaryVersionId,
      createdByUserId: input.createdByUserId ?? null,
    });
  }

  async approveRevision(input: {
    readonly revisionId: string;
    readonly approvedByUserId: string;
  }): Promise<TranslationRevisionSnapshot> {
    const baseRevision = await this.getRevisionById(input.revisionId);
    const resource = await this.findResourceById(baseRevision.translationResourceId);
    const resourceSnapshot = toTranslationResourceSnapshot(resource);
    const sourceSnapshot = await this.requireSourceSnapshot(resourceSnapshot);

    if (
      baseRevision.status !== TranslationRevisionStatus.MachineTranslated &&
      baseRevision.status !== TranslationRevisionStatus.Reviewed
    ) {
      throw new LocalizationRevisionNotApprovableError();
    }

    if (baseRevision.sourceContentHash !== sourceSnapshot.sourceContentHash) {
      throw new LocalizationRevisionStaleError();
    }

    const payload = parseTranslationPayloadJson(baseRevision.payloadJson);
    const adapter = this.translationSourceRegistryService.getAdapter(resource.resourceType);
    validateTranslationPayloadWithAdapter(adapter, sourceSnapshot, payload);

    const approvedAt = new Date();

    return this.createRevision({
      translationResourceId: baseRevision.translationResourceId,
      targetLocale: baseRevision.targetLocale,
      sourceContentHash: baseRevision.sourceContentHash,
      sourceVersionKey: baseRevision.sourceVersionKey,
      status: TranslationRevisionStatus.Approved,
      payload,
      providerId: baseRevision.providerId,
      providerModel: baseRevision.providerModel,
      glossaryVersionId: baseRevision.glossaryVersionId,
      createdByUserId: baseRevision.createdByUserId,
      approvedByUserId: input.approvedByUserId,
      approvedAt,
    });
  }

  async findLatestApprovedRevisionsForResources(input: {
    readonly translationResourceIds: readonly string[];
    readonly targetLocale: string;
  }): Promise<Map<string, TranslationRevisionSnapshot>> {
    if (input.translationResourceIds.length === 0) {
      return new Map();
    }

    const normalizedResourceIds = [
      ...new Set(input.translationResourceIds.map((id) => this.parseTranslationResourceId(id))),
    ];
    const normalizedTargetLocale = parseLocale(input.targetLocale);
    const revisions = await this.translationRevisionRepository
      .createQueryBuilder('revision')
      .where('revision.translationResourceId IN (:...translationResourceIds)', {
        translationResourceIds: normalizedResourceIds,
      })
      .andWhere('revision.targetLocale = :targetLocale', { targetLocale: normalizedTargetLocale })
      .andWhere('revision.status = :status', { status: TranslationRevisionStatus.Approved })
      .orderBy('revision.revisionNumber', 'DESC')
      .getMany();

    const latestByResourceId = new Map<string, TranslationRevisionSnapshot>();

    for (const revision of revisions) {
      const resourceId = normalizeUuid(revision.translationResourceId);

      if (!latestByResourceId.has(resourceId)) {
        latestByResourceId.set(resourceId, toTranslationRevisionSnapshot(revision));
      }
    }

    return latestByResourceId;
  }

  private async createRevisionWithRetry(
    revisionRepository: Repository<TranslationRevisionEntity>,
    translationResourceId: string,
    targetLocale: string,
    sourceContentHash: string,
    input: CreateTranslationRevisionInput,
    payloadJson: string,
  ): Promise<TranslationRevisionSnapshot> {
    const maxRevisionRow = await revisionRepository
      .createQueryBuilder('revision')
      .select('MAX(revision.revisionNumber)', 'maxRevisionNumber')
      .where('revision.translationResourceId = :translationResourceId', { translationResourceId })
      .andWhere('revision.targetLocale = :targetLocale', { targetLocale })
      .getRawOne<{ maxRevisionNumber: number | null }>();

    const nextRevisionNumber = (maxRevisionRow?.maxRevisionNumber ?? 0) + 1;
    const revision = revisionRepository.create({
      translationResourceId,
      targetLocale,
      revisionNumber: nextRevisionNumber,
      sourceContentHash,
      sourceVersionKey: input.sourceVersionKey ?? null,
      status: input.status,
      payloadJson,
      providerId: input.providerId ?? null,
      providerModel: input.providerModel ?? null,
      glossaryVersionId: normalizeOptionalUuid(input.glossaryVersionId),
      createdByUserId: normalizeOptionalUuid(input.createdByUserId),
      approvedByUserId: normalizeOptionalUuid(input.approvedByUserId),
      approvedAt: input.approvedAt ?? null,
    });

    const savedRevision = await revisionRepository.save(revision);

    return toTranslationRevisionSnapshot(savedRevision);
  }

  private async findResourceById(
    translationResourceId: string,
  ): Promise<TranslationResourceEntity> {
    const resource = await this.translationResourceRepository.findOne({
      where: { id: translationResourceId },
    });

    if (resource === null) {
      throw new TranslationResourceNotFoundError();
    }

    return resource;
  }

  private async resolveSourceSnapshot(
    resource: TranslationResourceSnapshot,
  ): Promise<TranslationSourceSnapshot | null> {
    try {
      return await this.translationSourceRegistryService.resolveSource(
        resource.resourceType,
        resource.resourceId,
      );
    } catch (error: unknown) {
      if (error instanceof UnsupportedTranslationResourceError) {
        return null;
      }

      throw error;
    }
  }

  private async requireSourceSnapshot(
    resource: TranslationResourceSnapshot,
  ): Promise<TranslationSourceSnapshot> {
    const sourceSnapshot = await this.resolveSourceSnapshot(resource);

    if (sourceSnapshot === null) {
      throw new UnsupportedTranslationResourceError();
    }

    return sourceSnapshot;
  }

  private parseTranslationResourceId(rawTranslationResourceId: string): string {
    if (!isUuidV4(rawTranslationResourceId)) {
      throw new TranslationResourceNotFoundError();
    }

    return normalizeUuid(rawTranslationResourceId);
  }
}
