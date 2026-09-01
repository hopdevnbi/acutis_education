import { Injectable } from '@nestjs/common';
import {
  CurriculumLessonTranslationAdapter,
  CurriculumMetadataTranslationAdapter,
  CurriculumTopicTranslationAdapter,
  CurriculumVersionTranslationAdapter,
} from '../adapters/curriculum-resource.adapters';
import { LearningContentDocumentTranslationAdapter } from '../adapters/learning-content-resource.adapter';
import { QuestionBankVersionTranslationAdapter } from '../adapters/question-bank-resource.adapter';
import { TranslationSourceRegistryService } from './translation-source-registry.service';

@Injectable()
export class TranslationSourceRegistryBootstrapService {
  constructor(
    translationSourceRegistryService: TranslationSourceRegistryService,
    curriculumMetadataTranslationAdapter: CurriculumMetadataTranslationAdapter,
    curriculumVersionTranslationAdapter: CurriculumVersionTranslationAdapter,
    curriculumTopicTranslationAdapter: CurriculumTopicTranslationAdapter,
    curriculumLessonTranslationAdapter: CurriculumLessonTranslationAdapter,
    learningContentDocumentTranslationAdapter: LearningContentDocumentTranslationAdapter,
    questionBankVersionTranslationAdapter: QuestionBankVersionTranslationAdapter,
  ) {
    translationSourceRegistryService.registerAdapter(curriculumMetadataTranslationAdapter);
    translationSourceRegistryService.registerAdapter(curriculumVersionTranslationAdapter);
    translationSourceRegistryService.registerAdapter(curriculumTopicTranslationAdapter);
    translationSourceRegistryService.registerAdapter(curriculumLessonTranslationAdapter);
    translationSourceRegistryService.registerAdapter(learningContentDocumentTranslationAdapter);
    translationSourceRegistryService.registerAdapter(questionBankVersionTranslationAdapter);
  }
}
