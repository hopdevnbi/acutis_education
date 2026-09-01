import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { TranslationConfigService } from '../config/translation-config.service';
import { TranslationJobEntity } from '../entities/translation-job.entity';
import { TranslationResourceEntity } from '../entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../entities/translation-revision.entity';
import {
  isActiveTranslationJobStatus,
  TranslationJobStatus,
} from '../enums/translation-job-status.enum';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';
import {
  TranslationJobNotFoundError,
  TranslationJobStateError,
  TranslationResourceNotFoundError,
} from '../errors/localization.errors';
import type {
  QueueTranslationJobInput,
  QueueTranslationJobResult,
  TranslationJobSnapshot,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import {
  toTranslationJobSnapshot,
  toTranslationRevisionSnapshot,
} from '../mappers/localization.mapper';
import { computeNextAttemptAt } from '../utils/translation-job-backoff.util';
import { sanitizeJobErrorMessage } from '../utils/sanitize-job-error-message.util';
import {
  assertSourceContentHash,
  assertTargetLocale,
  normalizeOptionalUuid,
} from '../utils/localization-validation.util';
import {
  isRetryableTranslationProviderErrorCode,
  type TranslationProviderErrorCode,
} from '../providers/errors/translation-provider.errors';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class TranslationJobService {
  constructor(
    @InjectRepository(TranslationJobEntity)
    private readonly translationJobRepository: Repository<TranslationJobEntity>,
    @InjectRepository(TranslationRevisionEntity)
    private readonly translationRevisionRepository: Repository<TranslationRevisionEntity>,
    @InjectRepository(TranslationResourceEntity)
    private readonly translationResourceRepository: Repository<TranslationResourceEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly translationConfigService: TranslationConfigService,
  ) {}

  async queueTranslation(input: QueueTranslationJobInput): Promise<QueueTranslationJobResult> {
    const translationResourceId = this.parseTranslationResourceId(input.translationResourceId);
    const resource = await this.findResourceById(translationResourceId);
    const targetLocale = assertTargetLocale(input.targetLocale, resource.sourceLocale);
    const sourceContentHash = assertSourceContentHash(input.sourceContentHash);
    const configuration = this.translationConfigService.getConfiguration();
    const providerId = input.providerId ?? configuration.selectedProvider;

    const shortCircuitRevision = await this.findShortCircuitRevision(
      translationResourceId,
      targetLocale,
      sourceContentHash,
    );

    if (shortCircuitRevision !== null) {
      return { kind: 'short_circuit_revision', revision: shortCircuitRevision };
    }

    const existingActiveJob = await this.translationJobRepository.findOne({
      where: [
        {
          translationResourceId,
          targetLocale,
          sourceContentHash,
          providerId,
          status: TranslationJobStatus.Queued,
        },
        {
          translationResourceId,
          targetLocale,
          sourceContentHash,
          providerId,
          status: TranslationJobStatus.Processing,
        },
      ],
      order: { createdAt: 'DESC' },
    });

    if (existingActiveJob !== null) {
      return {
        kind: 'existing_active',
        job: toTranslationJobSnapshot(existingActiveJob),
      };
    }

    const job = this.translationJobRepository.create({
      translationResourceId,
      targetLocale,
      sourceContentHash,
      sourceVersionKey: input.sourceVersionKey ?? null,
      status: TranslationJobStatus.Queued,
      attemptCount: 0,
      maxAttempts: configuration.jobMaxAttempts,
      requestedByUserId: normalizeOptionalUuid(input.requestedByUserId),
      providerId,
      lastErrorCode: null,
      lastErrorMessage: null,
      nextAttemptAt: null,
      lockedAt: null,
      startedAt: null,
      completedAt: null,
    });

    try {
      const savedJob = await this.translationJobRepository.save(job);

      return { kind: 'queued', job: toTranslationJobSnapshot(savedJob) };
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        const racedActiveJob = await this.translationJobRepository.findOne({
          where: [
            {
              translationResourceId,
              targetLocale,
              sourceContentHash,
              providerId,
              status: TranslationJobStatus.Queued,
            },
            {
              translationResourceId,
              targetLocale,
              sourceContentHash,
              providerId,
              status: TranslationJobStatus.Processing,
            },
          ],
          order: { createdAt: 'DESC' },
        });

        if (racedActiveJob !== null) {
          return {
            kind: 'existing_active',
            job: toTranslationJobSnapshot(racedActiveJob),
          };
        }
      }

      throw error;
    }
  }

  async claimNextBatch(batchSize: number): Promise<TranslationJobSnapshot[]> {
    const boundedBatchSize = Math.max(1, batchSize);

    return this.dataSource.transaction(async (entityManager) => {
      const claimedIds: Array<{ id: string }> = await entityManager.query(
        `
          WITH candidate AS (
            SELECT TOP (@0) [id]
            FROM [translation_jobs] WITH (UPDLOCK, READPAST, ROWLOCK)
            WHERE [status] = @1
              AND ([next_attempt_at] IS NULL OR [next_attempt_at] <= SYSUTCDATETIME())
            ORDER BY [created_at] ASC
          )
          UPDATE [translation_jobs]
          SET
            [status] = @2,
            [attempt_count] = [attempt_count] + 1,
            [locked_at] = SYSUTCDATETIME(),
            [started_at] = COALESCE([started_at], SYSUTCDATETIME()),
            [updated_at] = SYSUTCDATETIME()
          OUTPUT INSERTED.[id]
          FROM [translation_jobs]
          INNER JOIN candidate ON candidate.[id] = [translation_jobs].[id]
        `,
        [boundedBatchSize, TranslationJobStatus.Queued, TranslationJobStatus.Processing],
      );

      if (claimedIds.length === 0) {
        return [];
      }

      const jobRepository = entityManager.getRepository(TranslationJobEntity);
      const claimedJobs = await jobRepository
        .createQueryBuilder('job')
        .where('job.id IN (:...ids)', { ids: claimedIds.map((row) => row.id) })
        .orderBy('job.createdAt', 'ASC')
        .getMany();

      return claimedJobs.map((job) => toTranslationJobSnapshot(job));
    });
  }

  async markSucceeded(jobId: string): Promise<TranslationJobSnapshot> {
    const normalizedJobId = this.parseJobId(jobId);
    const job = await this.findJobById(normalizedJobId);

    if (job.status !== TranslationJobStatus.Processing) {
      throw new TranslationJobStateError('Only processing jobs can be marked succeeded.');
    }

    job.status = TranslationJobStatus.Succeeded;
    job.completedAt = new Date();
    job.lastErrorCode = null;
    job.lastErrorMessage = null;
    job.nextAttemptAt = null;
    job.lockedAt = null;

    const savedJob = await this.translationJobRepository.save(job);

    return toTranslationJobSnapshot(savedJob);
  }

  async markFailed(input: {
    readonly jobId: string;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly retryable: boolean;
  }): Promise<TranslationJobSnapshot> {
    const normalizedJobId = this.parseJobId(input.jobId);
    const job = await this.findJobById(normalizedJobId);

    if (job.status !== TranslationJobStatus.Processing) {
      throw new TranslationJobStateError('Only processing jobs can be marked failed.');
    }

    const retryable =
      input.retryable ||
      isRetryableTranslationProviderErrorCode(input.errorCode as TranslationProviderErrorCode);
    const shouldRetry = retryable && job.attemptCount < job.maxAttempts;
    job.lastErrorCode = input.errorCode;
    job.lastErrorMessage = sanitizeJobErrorMessage(input.errorMessage);
    job.lockedAt = null;

    if (shouldRetry) {
      job.status = TranslationJobStatus.Failed;
      job.nextAttemptAt = computeNextAttemptAt(job.attemptCount);
      job.completedAt = null;
    } else {
      job.status = TranslationJobStatus.Dead;
      job.completedAt = new Date();
      job.nextAttemptAt = null;
    }

    const savedJob = await this.translationJobRepository.save(job);

    return toTranslationJobSnapshot(savedJob);
  }

  async markSourceChanged(jobId: string): Promise<TranslationJobSnapshot> {
    const normalizedJobId = this.parseJobId(jobId);
    const job = await this.findJobById(normalizedJobId);

    if (!isActiveTranslationJobStatus(job.status) && job.status !== TranslationJobStatus.Failed) {
      throw new TranslationJobStateError(
        'Job cannot be marked source changed in its current state.',
      );
    }

    job.status = TranslationJobStatus.Dead;
    job.lastErrorCode = 'SOURCE_CHANGED';
    job.lastErrorMessage = sanitizeJobErrorMessage(
      'Source content hash changed before processing.',
    );
    job.completedAt = new Date();
    job.nextAttemptAt = null;
    job.lockedAt = null;

    const savedJob = await this.translationJobRepository.save(job);

    return toTranslationJobSnapshot(savedJob);
  }

  async retryFailed(jobId: string): Promise<TranslationJobSnapshot> {
    const normalizedJobId = this.parseJobId(jobId);
    const job = await this.findJobById(normalizedJobId);

    if (job.status !== TranslationJobStatus.Failed && job.status !== TranslationJobStatus.Dead) {
      throw new TranslationJobStateError('Only failed or dead jobs can be retried explicitly.');
    }

    job.status = TranslationJobStatus.Queued;
    job.nextAttemptAt = null;
    job.lastErrorCode = null;
    job.lastErrorMessage = null;
    job.completedAt = null;
    job.lockedAt = null;
    job.startedAt = null;

    const savedJob = await this.translationJobRepository.save(job);

    return toTranslationJobSnapshot(savedJob);
  }

  async requeueFailedDueJobs(now: Date = new Date()): Promise<number> {
    const result = await this.translationJobRepository
      .createQueryBuilder()
      .update(TranslationJobEntity)
      .set({
        status: TranslationJobStatus.Queued,
        lockedAt: null,
      })
      .where('status = :status', { status: TranslationJobStatus.Failed })
      .andWhere('nextAttemptAt IS NOT NULL')
      .andWhere('nextAttemptAt <= :now', { now })
      .execute();

    return result.affected ?? 0;
  }

  private async findShortCircuitRevision(
    translationResourceId: string,
    targetLocale: string,
    sourceContentHash: string,
  ): Promise<TranslationRevisionSnapshot | null> {
    const revision = await this.translationRevisionRepository.findOne({
      where: [
        {
          translationResourceId,
          targetLocale,
          sourceContentHash,
          status: TranslationRevisionStatus.Approved,
        },
        {
          translationResourceId,
          targetLocale,
          sourceContentHash,
          status: TranslationRevisionStatus.MachineTranslated,
        },
      ],
      order: { revisionNumber: 'DESC' },
    });

    if (revision === null) {
      return null;
    }

    return toTranslationRevisionSnapshot(revision);
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

  private async findJobById(jobId: string): Promise<TranslationJobEntity> {
    const job = await this.translationJobRepository.findOne({ where: { id: jobId } });

    if (job === null) {
      throw new TranslationJobNotFoundError();
    }

    return job;
  }

  private parseTranslationResourceId(rawTranslationResourceId: string): string {
    if (!isUuidV4(rawTranslationResourceId)) {
      throw new TranslationResourceNotFoundError();
    }

    return normalizeUuid(rawTranslationResourceId);
  }

  private parseJobId(rawJobId: string): string {
    if (!isUuidV4(rawJobId)) {
      throw new TranslationJobNotFoundError();
    }

    return normalizeUuid(rawJobId);
  }
}
