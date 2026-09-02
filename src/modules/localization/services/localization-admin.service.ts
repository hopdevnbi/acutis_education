import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { LessonService } from '../../curriculum/services/lesson.service';
import { TopicService } from '../../curriculum/services/topic.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import { TranslationJobStatus } from '../enums/translation-job-status.enum';
import { LOCALIZATION_BULK_MAX_RESOURCES } from '../constants/localization-admin.constants';
import {
  LocalizationBulkLimitExceededError,
  LocalizationJobNotRetryableError,
  LocalizationSourceUnavailableError,
} from '../errors/localization-admin.errors';
import {
  TranslationResourceNotFoundError,
  UnsupportedTranslationResourceError,
} from '../errors/localization.errors';
import type {
  BulkTranslationResult,
  RequestTranslationResult,
  SyncTranslationResourceInput,
  TranslationJobListFilter,
  TranslationJobListResult,
  TranslationJobSnapshot,
  TranslationResourceDetail,
  TranslationResourceListFilter,
  TranslationResourceListResult,
  TranslationResourceSnapshot,
  TranslationRevisionDetail,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import type { TranslationSourceSnapshot } from '../interfaces/translation-source-adapter.interface';
import {
  deriveAdminTranslationEffectiveStatus,
  isAdminTranslationEffectiveStatus,
} from '../enums/admin-translation-effective-status.enum';
import { LocalizedResourceResolutionService } from './localized-resource-resolution.service';
import { LocalizationAccessService } from './localization-access.service';
import { TranslationJobService } from './translation-job.service';
import { TranslationResourceService } from './translation-resource.service';
import { TranslationRevisionService } from './translation-revision.service';
import { TranslationSourceRegistryService } from './translation-source-registry.service';

@Injectable()
export class LocalizationAdminService {
  constructor(
    private readonly localizationAccessService: LocalizationAccessService,
    private readonly translationResourceService: TranslationResourceService,
    private readonly translationRevisionService: TranslationRevisionService,
    private readonly translationJobService: TranslationJobService,
    private readonly translationSourceRegistryService: TranslationSourceRegistryService,
    private readonly localizedResourceResolutionService: LocalizedResourceResolutionService,
    private readonly curriculumService: CurriculumService,
    private readonly lessonService: LessonService,
    private readonly topicService: TopicService,
    private readonly questionBankService: QuestionBankService,
  ) {}

  async syncResource(
    rawUserId: string,
    input: SyncTranslationResourceInput,
  ): Promise<TranslationResourceSnapshot> {
    const sourceSnapshot = await this.resolveSourceForSync(input);
    const parishId = await this.resolveParishIdForResource(
      sourceSnapshot.resourceType,
      sourceSnapshot.resourceId,
    );
    const resource = await this.translationResourceService.getOrCreateResource({
      resourceType: sourceSnapshot.resourceType,
      resourceId: sourceSnapshot.resourceId,
      parishId,
      sourceLocale: sourceSnapshot.sourceLocale,
    });

    await this.localizationAccessService.assertCanManageResource(rawUserId, resource);

    return resource;
  }

  async listResources(
    rawUserId: string,
    filter: TranslationResourceListFilter & { readonly parishId?: string },
  ): Promise<TranslationResourceListResult> {
    const parishIds = await this.localizationAccessService.resolveListParishScope(
      rawUserId,
      filter.parishId,
    );
    const scopedFilter = { ...filter, parishIds };

    if (
      filter.translationStatus !== undefined &&
      isAdminTranslationEffectiveStatus(filter.translationStatus)
    ) {
      const candidates = await this.translationResourceService.listAllCandidates(scopedFilter);
      const currentSourceHashes = await this.resolveCurrentSourceHashes(candidates);

      return this.translationResourceService.paginateStatusFilteredList(
        scopedFilter,
        candidates,
        currentSourceHashes,
      );
    }

    const listResult = await this.translationResourceService.listResources(scopedFilter);

    if (filter.targetLocale === undefined) {
      return listResult;
    }

    const currentSourceHashes = await this.resolveCurrentSourceHashes(listResult.items);

    return this.translationResourceService.applySourceHashesToListResult(
      listResult,
      currentSourceHashes,
      filter.targetLocale,
    );
  }

  async getResourceDetail(
    rawUserId: string,
    translationResourceId: string,
    targetLocale?: string,
  ): Promise<TranslationResourceDetail> {
    const resource = await this.translationResourceService.getResourceById(translationResourceId);
    await this.localizationAccessService.assertCanReadResource(rawUserId, resource);

    const normalizedTargetLocale =
      targetLocale === undefined
        ? null
        : this.localizationAccessService.parseTargetLocale(targetLocale, resource.sourceLocale);
    const sourceSnapshot = await this.resolveSourceSnapshot(resource);
    const latestRevision =
      normalizedTargetLocale === null
        ? null
        : await this.translationRevisionService.getLatestRevision(
            resource.id,
            normalizedTargetLocale,
          );
    const latestJob =
      normalizedTargetLocale === null
        ? null
        : await this.findLatestJob(resource.id, normalizedTargetLocale);

    return {
      resource,
      targetLocale: normalizedTargetLocale,
      effectiveStatus:
        normalizedTargetLocale === null || sourceSnapshot === null
          ? null
          : deriveAdminTranslationEffectiveStatus({
              revision: latestRevision,
              currentSourceContentHash: sourceSnapshot.sourceContentHash,
            }),
      currentSourceContentHash: sourceSnapshot?.sourceContentHash ?? null,
      currentSourceVersionKey: sourceSnapshot?.sourceVersionKey ?? null,
      latestRevision,
      latestJob,
    };
  }

  async requestTranslation(input: {
    readonly userId: string;
    readonly translationResourceId: string;
    readonly targetLocale: string;
    readonly providerId?: string | null;
  }): Promise<RequestTranslationResult> {
    const resource = await this.translationResourceService.getResourceById(
      input.translationResourceId,
    );
    await this.localizationAccessService.assertCanManageResource(input.userId, resource);

    const targetLocale = this.localizationAccessService.parseTargetLocale(
      input.targetLocale,
      resource.sourceLocale,
    );
    const sourceSnapshot = await this.requireSourceSnapshot(resource);
    const queueResult = await this.translationJobService.queueTranslation({
      translationResourceId: resource.id,
      targetLocale,
      sourceContentHash: sourceSnapshot.sourceContentHash,
      sourceVersionKey: sourceSnapshot.sourceVersionKey,
      requestedByUserId: input.userId,
      providerId: input.providerId ?? null,
    });

    if (queueResult.kind === 'queued') {
      return { kind: 'queued', job: queueResult.job, httpStatus: 201 };
    }

    if (queueResult.kind === 'existing_active') {
      return { kind: 'existing_active', job: queueResult.job, httpStatus: 200 };
    }

    return {
      kind: 'short_circuit_revision',
      revision: queueResult.revision,
      httpStatus: 200,
    };
  }

  async bulkRequestTranslation(input: {
    readonly userId: string;
    readonly translationResourceIds: readonly string[];
    readonly targetLocale: string;
    readonly providerId?: string | null;
  }): Promise<BulkTranslationResult> {
    if (input.translationResourceIds.length > LOCALIZATION_BULK_MAX_RESOURCES) {
      throw new LocalizationBulkLimitExceededError();
    }

    let queuedCount = 0;
    let existingCount = 0;
    let skippedCount = 0;
    const results: RequestTranslationResult[] = [];

    for (const translationResourceId of input.translationResourceIds) {
      try {
        const result = await this.requestTranslation({
          userId: input.userId,
          translationResourceId,
          targetLocale: input.targetLocale,
          providerId: input.providerId,
        });
        results.push(result);

        if (result.kind === 'queued') {
          queuedCount += 1;
        } else {
          existingCount += 1;
        }
      } catch {
        skippedCount += 1;
      }
    }

    return { queuedCount, existingCount, skippedCount, results };
  }

  async getRevisionDetail(
    rawUserId: string,
    revisionId: string,
  ): Promise<TranslationRevisionDetail> {
    const detail = await this.translationRevisionService.getRevisionDetail(revisionId);
    await this.localizationAccessService.assertCanReadResource(rawUserId, detail.resource);

    return detail;
  }

  async reviewRevision(input: {
    readonly userId: string;
    readonly revisionId: string;
    readonly payload: Record<string, unknown>;
  }): Promise<TranslationRevisionSnapshot> {
    const detail = await this.translationRevisionService.getRevisionDetail(input.revisionId);
    await this.localizationAccessService.assertCanManageResource(input.userId, detail.resource);

    return this.translationRevisionService.createReviewedRevisionFromRevision({
      revisionId: input.revisionId,
      payload: input.payload,
      createdByUserId: input.userId,
    });
  }

  async approveRevision(input: {
    readonly userId: string;
    readonly revisionId: string;
  }): Promise<TranslationRevisionSnapshot> {
    const detail = await this.translationRevisionService.getRevisionDetail(input.revisionId);
    await this.localizationAccessService.assertCanApproveResource(input.userId, detail.resource);

    return this.translationRevisionService.approveRevision({
      revisionId: input.revisionId,
      approvedByUserId: input.userId,
    });
  }

  async previewResource(input: {
    readonly userId: string;
    readonly translationResourceId: string;
    readonly locale: string;
  }): Promise<{
    readonly resource: TranslationResourceSnapshot;
    readonly resolution: Awaited<
      ReturnType<LocalizedResourceResolutionService['resolveLocalizedResource']>
    >;
  }> {
    const resource = await this.translationResourceService.getResourceById(
      input.translationResourceId,
    );
    await this.localizationAccessService.assertCanReadResource(input.userId, resource);
    const targetLocale = this.localizationAccessService.parseTargetLocale(
      input.locale,
      resource.sourceLocale,
    );
    const resolution = await this.localizedResourceResolutionService.resolveLocalizedResource({
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      targetLocale,
      parishId: resource.parishId,
      requestedLocale: targetLocale,
    });

    return { resource, resolution };
  }

  async listJobs(
    rawUserId: string,
    filter: Omit<TranslationJobListFilter, 'parishIds'>,
  ): Promise<TranslationJobListResult> {
    const parishIds = await this.localizationAccessService.resolveListParishScope(
      rawUserId,
      undefined,
    );

    return this.translationJobService.listJobs({ ...filter, parishIds });
  }

  async getJobDetail(rawUserId: string, jobId: string): Promise<TranslationJobSnapshot> {
    const parishIds = await this.localizationAccessService.resolveListParishScope(
      rawUserId,
      undefined,
    );
    const job = await this.translationJobService.getJobById(jobId, parishIds);
    const resource = await this.translationResourceService.getResourceById(
      job.translationResourceId,
    );
    await this.localizationAccessService.assertCanReadResource(rawUserId, resource);

    return job;
  }

  async retryJob(rawUserId: string, jobId: string): Promise<RequestTranslationResult> {
    const parishIds = await this.localizationAccessService.resolveListParishScope(
      rawUserId,
      undefined,
    );
    const job = await this.translationJobService.getJobById(jobId, parishIds);
    const resource = await this.translationResourceService.getResourceById(
      job.translationResourceId,
    );
    await this.localizationAccessService.assertCanManageResource(rawUserId, resource);

    if (job.status === TranslationJobStatus.Failed) {
      const retriedJob = await this.translationJobService.retryFailed(job.id);

      return { kind: 'existing_active', job: retriedJob, httpStatus: 200 };
    }

    if (job.status === TranslationJobStatus.Dead && job.lastErrorCode === 'SOURCE_CHANGED') {
      return this.requestTranslation({
        userId: rawUserId,
        translationResourceId: resource.id,
        targetLocale: job.targetLocale,
        providerId: job.providerId,
      });
    }

    if (job.status === TranslationJobStatus.Dead) {
      const retriedJob = await this.translationJobService.retryFailed(job.id);

      return { kind: 'existing_active', job: retriedJob, httpStatus: 200 };
    }

    throw new LocalizationJobNotRetryableError();
  }

  private async resolveParishIdForResource(
    resourceType: TranslationResourceType,
    resourceId: string,
  ): Promise<string | null> {
    switch (resourceType) {
      case TranslationResourceType.CurriculumMetadata: {
        const curriculum = await this.curriculumService.getCurriculumById(resourceId);

        return curriculum.parishId;
      }
      case TranslationResourceType.CurriculumVersion: {
        const version = await this.curriculumService.getVersionById(resourceId);
        const curriculum = await this.curriculumService.getCurriculumById(version.curriculumId);

        return curriculum.parishId;
      }
      case TranslationResourceType.CurriculumTopic: {
        const topic = await this.topicService.getTopicById(resourceId);
        const version = await this.curriculumService.getVersionById(topic.curriculumVersionId);
        const curriculum = await this.curriculumService.getCurriculumById(version.curriculumId);

        return curriculum.parishId;
      }
      case TranslationResourceType.CurriculumLesson: {
        const context = await this.lessonService.getLessonCurriculumContext(resourceId);

        return context.parishId;
      }
      case TranslationResourceType.LearningContentDocument: {
        const context = await this.lessonService.getLessonCurriculumContext(resourceId);

        return context.parishId;
      }
      case TranslationResourceType.QuestionBankVersion:
        return this.questionBankService.getVersionQuestionParishId(resourceId);
      default:
        return null;
    }
  }

  private async resolveSourceForSync(
    input: SyncTranslationResourceInput,
  ): Promise<TranslationSourceSnapshot> {
    if (
      !Object.values(TranslationResourceType).includes(
        input.resourceType as TranslationResourceType,
      )
    ) {
      throw new TranslationResourceNotFoundError();
    }

    try {
      const sourceSnapshot = await this.translationSourceRegistryService.resolveSource(
        input.resourceType as TranslationResourceType,
        input.resourceId,
      );

      if (sourceSnapshot === null) {
        throw new LocalizationSourceUnavailableError();
      }

      return sourceSnapshot;
    } catch (error: unknown) {
      if (error instanceof UnsupportedTranslationResourceError) {
        throw new LocalizationSourceUnavailableError();
      }

      throw error;
    }
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
      throw new LocalizationSourceUnavailableError();
    }

    return sourceSnapshot;
  }

  private async resolveCurrentSourceHashes(
    items: ReadonlyArray<{
      readonly id: string;
      readonly resourceType: string;
      readonly resourceId: string;
    }>,
  ): Promise<Map<string, string>> {
    const hashes = new Map<string, string>();

    await Promise.all(
      items.map(async (item) => {
        try {
          const sourceSnapshot = await this.translationSourceRegistryService.resolveSource(
            item.resourceType as TranslationResourceType,
            item.resourceId,
          );

          if (sourceSnapshot !== null) {
            hashes.set(normalizeUuid(item.id), sourceSnapshot.sourceContentHash);
          }
        } catch {
          return;
        }
      }),
    );

    return hashes;
  }

  private async findLatestJob(
    translationResourceId: string,
    targetLocale: string,
  ): Promise<TranslationJobSnapshot | null> {
    const result = await this.translationJobService.listJobs({
      translationResourceId,
      targetLocale,
      page: 1,
      limit: 1,
      parishIds: null,
    });

    return result.items[0] ?? null;
  }
}
