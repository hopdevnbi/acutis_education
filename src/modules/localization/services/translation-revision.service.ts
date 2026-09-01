import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { TranslationResourceEntity } from '../entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../entities/translation-revision.entity';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';
import {
  TranslationResourceNotFoundError,
  TranslationRevisionNotFoundError,
} from '../errors/localization.errors';
import type {
  CreateTranslationRevisionInput,
  LatestApprovedTranslationRevisionResult,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import { toTranslationRevisionSnapshot } from '../mappers/localization.mapper';
import { deriveTranslationReadStatus } from '../utils/derive-translation-read-status.util';
import {
  assertApprovedRevisionMetadata,
  assertPersistedRevisionStatus,
  assertSourceContentHash,
  assertTargetLocale,
  assertTranslationPayload,
  normalizeOptionalUuid,
} from '../utils/localization-validation.util';

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

  private parseTranslationResourceId(rawTranslationResourceId: string): string {
    if (!isUuidV4(rawTranslationResourceId)) {
      throw new TranslationResourceNotFoundError();
    }

    return normalizeUuid(rawTranslationResourceId);
  }
}
