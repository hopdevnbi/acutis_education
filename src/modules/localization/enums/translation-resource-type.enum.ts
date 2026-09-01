export enum TranslationResourceType {
  CurriculumMetadata = 'CURRICULUM_METADATA',
  CurriculumVersion = 'CURRICULUM_VERSION',
  CurriculumTopic = 'CURRICULUM_TOPIC',
  CurriculumLesson = 'CURRICULUM_LESSON',
  LearningContentDocument = 'LEARNING_CONTENT_DOCUMENT',
  QuestionBankVersion = 'QUESTION_BANK_VERSION',
}

const TRANSLATION_RESOURCE_TYPES = new Set<string>(Object.values(TranslationResourceType));

export function isTranslationResourceType(value: string): value is TranslationResourceType {
  return TRANSLATION_RESOURCE_TYPES.has(value);
}

export function assertTranslationResourceType(value: string): TranslationResourceType {
  if (!isTranslationResourceType(value)) {
    throw new Error(`Unsupported translation resource type: ${value}`);
  }

  return value;
}
