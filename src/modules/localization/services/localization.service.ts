import { Injectable } from '@nestjs/common';
import type {
  CreateTranslationRevisionInput,
  GetOrCreateTranslationResourceInput,
  LatestApprovedTranslationRevisionResult,
  LocaleResolutionInput,
  LocaleResolutionResult,
  QueueTranslationJobInput,
  QueueTranslationJobResult,
  LocalizedResourceResolution,
  ResolveLocalizedResourceInput,
  ResolveLocalizedResourceWithRevisionInput,
  TranslationJobProcessingSummary,
  TranslationResourceRef,
  TranslationResourceSnapshot,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import { LocaleResolutionService } from './locale-resolution.service';
import { LocalizedResourceResolutionService } from './localized-resource-resolution.service';
import { TranslationJobProcessorService } from './translation-job-processor.service';
import { TranslationJobService } from './translation-job.service';
import { TranslationResourceService } from './translation-resource.service';
import { TranslationRevisionService } from './translation-revision.service';

@Injectable()
export class LocalizationService {
  constructor(
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly translationResourceService: TranslationResourceService,
    private readonly translationRevisionService: TranslationRevisionService,
    private readonly translationJobService: TranslationJobService,
    private readonly translationJobProcessorService: TranslationJobProcessorService,
    private readonly localizedResourceResolutionService: LocalizedResourceResolutionService,
  ) {}

  resolveLocale(input: LocaleResolutionInput): LocaleResolutionResult {
    return this.localeResolutionService.resolveLocale(input);
  }

  getOrCreateTranslationResource(
    input: GetOrCreateTranslationResourceInput,
  ): Promise<TranslationResourceSnapshot> {
    return this.translationResourceService.getOrCreateResource(input);
  }

  getTranslationResourceByRef(ref: TranslationResourceRef): Promise<TranslationResourceSnapshot> {
    return this.translationResourceService.getResourceByRef(ref);
  }

  createTranslationRevision(
    input: CreateTranslationRevisionInput,
  ): Promise<TranslationRevisionSnapshot> {
    return this.translationRevisionService.createRevision(input);
  }

  getLatestTranslationRevision(
    translationResourceId: string,
    targetLocale: string,
  ): Promise<TranslationRevisionSnapshot | null> {
    return this.translationRevisionService.getLatestRevision(translationResourceId, targetLocale);
  }

  getLatestApprovedTranslationRevision(input: {
    readonly translationResourceId: string;
    readonly targetLocale: string;
    readonly currentSourceContentHash: string;
  }): Promise<LatestApprovedTranslationRevisionResult> {
    return this.translationRevisionService.getLatestApprovedRevision(input);
  }

  queueTranslationJob(input: QueueTranslationJobInput): Promise<QueueTranslationJobResult> {
    return this.translationJobService.queueTranslation(input);
  }

  processTranslationJobs(batchSize?: number): Promise<TranslationJobProcessingSummary> {
    return this.translationJobProcessorService.processBatch(batchSize);
  }

  resolveLocalizedResource(
    input: ResolveLocalizedResourceInput,
  ): Promise<LocalizedResourceResolution> {
    return this.localizedResourceResolutionService.resolveLocalizedResource(input);
  }

  resolveLocalizedResources(
    inputs: readonly ResolveLocalizedResourceInput[],
  ): Promise<readonly LocalizedResourceResolution[]> {
    return this.localizedResourceResolutionService.resolveLocalizedResources(inputs);
  }

  resolveLocalizedResourceWithRevision(
    input: ResolveLocalizedResourceWithRevisionInput,
  ): Promise<LocalizedResourceResolution> {
    return this.localizedResourceResolutionService.resolveLocalizedResourceWithRevision(input);
  }
}
