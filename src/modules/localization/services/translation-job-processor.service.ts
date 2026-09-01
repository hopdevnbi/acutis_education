import { Injectable, Logger } from '@nestjs/common';
import { TranslationConfigService } from '../config/translation-config.service';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';
import { TranslationJobStatus } from '../enums/translation-job-status.enum';
import { TranslationProviderId } from '../enums/translation-provider-id.enum';
import {
  UnsupportedTranslationResourceError,
  TranslationResourceNotFoundError,
} from '../errors/localization.errors';
import type {
  TranslationJobProcessingSummary,
  TranslationJobSnapshot,
} from '../interfaces/localization.interface';
import {
  TranslationProviderError,
  isRetryableTranslationProviderErrorCode,
} from '../providers/errors/translation-provider.errors';
import { TranslationProviderRegistry } from '../providers/translation-provider-registry.service';
import { assertTranslationBatchGuardrails } from '../utils/translation-batch-guardrails.util';
import { CatholicGlossaryService } from './catholic-glossary.service';
import { TranslationJobService } from './translation-job.service';
import { TranslationResourceService } from './translation-resource.service';
import { TranslationRevisionService } from './translation-revision.service';
import { TranslationSourceRegistryService } from './translation-source-registry.service';
import { MockTranslationProvider } from '../providers/mock-translation.provider';

@Injectable()
export class TranslationJobProcessorService {
  private readonly logger = new Logger(TranslationJobProcessorService.name);

  constructor(
    private readonly translationJobService: TranslationJobService,
    private readonly translationResourceService: TranslationResourceService,
    private readonly translationRevisionService: TranslationRevisionService,
    private readonly translationSourceRegistryService: TranslationSourceRegistryService,
    private readonly catholicGlossaryService: CatholicGlossaryService,
    private readonly translationProviderRegistry: TranslationProviderRegistry,
    private readonly translationConfigService: TranslationConfigService,
    private readonly mockTranslationProvider: MockTranslationProvider,
  ) {}

  async processBatch(batchSize?: number): Promise<TranslationJobProcessingSummary> {
    const configuration = this.translationConfigService.getConfiguration();
    const effectiveBatchSize = batchSize ?? configuration.jobDefaultBatchSize;

    await this.translationJobService.requeueFailedDueJobs();

    const claimedJobs = await this.translationJobService.claimNextBatch(effectiveBatchSize);
    let succeededCount = 0;
    let failedCount = 0;
    let deadCount = 0;

    for (const job of claimedJobs) {
      const result = await this.processSingleJob(job);

      if (result === 'SUCCEEDED') {
        succeededCount += 1;
      } else if (result === 'FAILED') {
        failedCount += 1;
      } else {
        deadCount += 1;
      }
    }

    return {
      claimedCount: claimedJobs.length,
      succeededCount,
      failedCount,
      deadCount,
    };
  }

  private async processSingleJob(
    job: TranslationJobSnapshot,
  ): Promise<'SUCCEEDED' | 'FAILED' | 'DEAD'> {
    const startedAt = Date.now();

    try {
      const resource = await this.translationResourceService.getResourceById(
        job.translationResourceId,
      );

      this.logger.log(
        `Processing translation job ${job.id} for ${resource.resourceType}/${resource.resourceId} target=${job.targetLocale}`,
      );

      let sourceSnapshot;

      try {
        sourceSnapshot = await this.translationSourceRegistryService.resolveSource(
          resource.resourceType,
          resource.resourceId,
        );
      } catch (error: unknown) {
        if (
          error instanceof UnsupportedTranslationResourceError ||
          error instanceof TranslationResourceNotFoundError
        ) {
          const updatedJob = await this.translationJobService.markFailed({
            jobId: job.id,
            errorCode: 'UNSUPPORTED_RESOURCE',
            errorMessage: 'Translation source resource is unsupported.',
            retryable: false,
          });

          return updatedJob.status === TranslationJobStatus.Dead ? 'DEAD' : 'FAILED';
        }

        throw error;
      }

      if (sourceSnapshot.sourceContentHash !== job.sourceContentHash) {
        await this.translationJobService.markSourceChanged(job.id);

        return 'DEAD';
      }

      const adapter = this.translationSourceRegistryService.getAdapter(resource.resourceType);
      const units = adapter.extractTranslatableUnits(sourceSnapshot);
      const configuration = this.translationConfigService.getConfiguration();

      assertTranslationBatchGuardrails({
        units,
        maxBatchUnits: configuration.maxBatchUnits,
        maxBatchChars: configuration.maxBatchChars,
        maxUnitChars: configuration.maxUnitChars,
      });

      const publishedGlossary = await this.catholicGlossaryService.getPublishedForPair({
        sourceLocale: sourceSnapshot.sourceLocale,
        targetLocale: job.targetLocale,
      });

      if (publishedGlossary !== null) {
        const terms = await this.catholicGlossaryService.listTermsForVersion(publishedGlossary.id);

        if (configuration.selectedProvider === TranslationProviderId.Mock) {
          this.mockTranslationProvider.registerGlossaryTerms(
            publishedGlossary.id,
            terms.map((term) => ({
              sourceTerm: term.sourceTerm,
              targetTerm: term.targetTerm,
              caseSensitive: term.caseSensitive,
            })),
          );
        }
      }

      const provider =
        job.providerId === TranslationProviderId.Google
          ? this.translationProviderRegistry.getProviderById(TranslationProviderId.Google)
          : this.translationProviderRegistry.getSelectedProvider();

      const translatedUnits = await provider.translateBatch({
        units,
        sourceLocale: sourceSnapshot.sourceLocale,
        targetLocale: job.targetLocale,
        glossary:
          publishedGlossary === null
            ? null
            : {
                glossaryVersionId: publishedGlossary.id,
                providerGlossaryId: publishedGlossary.providerGlossaryId,
              },
      });

      const payload = adapter.buildPayload(sourceSnapshot, translatedUnits);

      await this.translationRevisionService.createRevision({
        translationResourceId: job.translationResourceId,
        targetLocale: job.targetLocale,
        sourceContentHash: job.sourceContentHash,
        sourceVersionKey: job.sourceVersionKey,
        status: TranslationRevisionStatus.MachineTranslated,
        payload,
        providerId: provider.providerId,
        providerModel: null,
        glossaryVersionId: publishedGlossary?.id ?? null,
      });

      await this.translationJobService.markSucceeded(job.id);

      this.logger.log(`Translation job ${job.id} succeeded in ${String(Date.now() - startedAt)}ms`);

      return 'SUCCEEDED';
    } catch (error: unknown) {
      const mapped = this.mapProcessingError(error);
      const updatedJob = await this.translationJobService.markFailed({
        jobId: job.id,
        errorCode: mapped.code,
        errorMessage: mapped.message,
        retryable: mapped.retryable,
      });

      this.logger.warn(
        `Translation job ${job.id} failed code=${mapped.code} retryable=${String(mapped.retryable)} durationMs=${String(Date.now() - startedAt)}`,
      );

      return updatedJob.status === TranslationJobStatus.Dead ? 'DEAD' : 'FAILED';
    }
  }

  private mapProcessingError(error: unknown): {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  } {
    if (error instanceof TranslationProviderError) {
      return {
        code: error.code,
        message: error.message,
        retryable: isRetryableTranslationProviderErrorCode(error.code),
      };
    }

    if (error instanceof UnsupportedTranslationResourceError) {
      return {
        code: 'UNSUPPORTED_RESOURCE',
        message: error.message,
        retryable: false,
      };
    }

    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown translation job failure.',
      retryable: false,
    };
  }
}
