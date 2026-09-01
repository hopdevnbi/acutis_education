import { Injectable } from '@nestjs/common';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { LearningContentService } from '../../learning-content/services/learning-content.service';
import type { ContentDocumentV1 } from '../../learning-content/interfaces/learning-content.interface';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import type {
  TranslationSourceAdapter,
  TranslationSourceSnapshot,
} from '../interfaces/translation-source-adapter.interface';
import type { TranslatableUnit, TranslatedUnit } from '../providers/translation-provider.interface';
import {
  applyLearningContentTranslation,
  buildLearningContentTranslationPayload,
  extractLearningContentTranslatableUnits,
} from '../utils/learning-content-translation.util';

@Injectable()
export class LearningContentDocumentTranslationAdapter implements TranslationSourceAdapter {
  readonly resourceType = TranslationResourceType.LearningContentDocument;

  constructor(
    private readonly learningContentService: LearningContentService,
    private readonly curriculumService: CurriculumService,
  ) {}

  async resolveSource(resourceId: string): Promise<TranslationSourceSnapshot | null> {
    try {
      const content = await this.learningContentService.getLessonContent(resourceId);

      if (content.contentHash === null) {
        return null;
      }

      const lessonContext = await this.curriculumService.getLessonCurriculumContext(resourceId);
      const curriculum = await this.curriculumService.getCurriculumById(lessonContext.curriculumId);

      return {
        resourceType: this.resourceType,
        resourceId: content.lessonId,
        sourceLocale: curriculum.sourceLocale,
        sourceContentHash: content.contentHash,
        sourceVersionKey: lessonContext.canonicalLessonKey,
        payload: {
          document: content.document,
        },
      };
    } catch {
      return null;
    }
  }

  extractTranslatableUnits(snapshot: TranslationSourceSnapshot): TranslatableUnit[] {
    const document = snapshot.payload['document'] as ContentDocumentV1;

    return extractLearningContentTranslatableUnits(document);
  }

  buildPayload(
    snapshot: TranslationSourceSnapshot,
    translatedUnits: readonly TranslatedUnit[],
  ): Record<string, unknown> {
    const document = snapshot.payload['document'] as ContentDocumentV1;

    return buildLearningContentTranslationPayload(document, translatedUnits);
  }

  applyTranslation(
    snapshot: TranslationSourceSnapshot,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const document = snapshot.payload['document'] as ContentDocumentV1;

    return {
      document: applyLearningContentTranslation(document, payload),
    };
  }
}
