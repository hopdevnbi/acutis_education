import { Injectable } from '@nestjs/common';
import type {
  CreateTranslationRevisionInput,
  GetOrCreateTranslationResourceInput,
  LatestApprovedTranslationRevisionResult,
  LocaleResolutionInput,
  LocaleResolutionResult,
  TranslationResourceRef,
  TranslationResourceSnapshot,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import { LocaleResolutionService } from './locale-resolution.service';
import { TranslationResourceService } from './translation-resource.service';
import { TranslationRevisionService } from './translation-revision.service';

@Injectable()
export class LocalizationService {
  constructor(
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly translationResourceService: TranslationResourceService,
    private readonly translationRevisionService: TranslationRevisionService,
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
}
