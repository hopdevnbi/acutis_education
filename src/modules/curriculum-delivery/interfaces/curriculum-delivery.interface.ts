import type { ContentDocumentV1 } from '../../learning-content/interfaces/learning-content.interface';

export type LearnerTranslationStatus = 'SOURCE' | 'APPROVED' | 'MISSING' | 'STALE';

export interface LearnerCurriculumSummary {
  readonly id: string;
  readonly name: string;
  readonly sourceLocale: string;
}

export interface LearnerCurriculumVersionSummary {
  readonly id: string;
  readonly versionNumber: number;
  readonly label: string | null;
}

export interface LearnerLessonSummary {
  readonly id: string;
  readonly canonicalLessonKey: string;
  readonly title: string;
  readonly summary: string | null;
  readonly sortOrder: number;
  readonly estimatedDurationMinutes: number | null;
}

export interface LearnerTopicTree {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly lessons: readonly LearnerLessonSummary[];
}

export interface LearnerCurriculumTree {
  readonly curriculum: LearnerCurriculumSummary;
  readonly version: LearnerCurriculumVersionSummary;
  readonly topics: readonly LearnerTopicTree[];
  readonly requestedLocale: string | null;
  readonly resolvedLocale: string;
  readonly sourceLocale: string;
  readonly translationStatus: LearnerTranslationStatus;
  readonly isFallback: boolean;
}

export interface LearnerLessonContent {
  readonly lessonId: string;
  readonly canonicalLessonKey: string;
  readonly curriculumVersionId: string;
  readonly versionNumber: number;
  readonly sourceLocale: string;
  readonly resolvedLocale: string;
  readonly isFallback: boolean;
  readonly translationStatus: LearnerTranslationStatus;
  readonly requestedLocale: string | null;
  readonly translationRevisionId: string | null;
  readonly sourceContentHash: string;
  readonly contentSchemaVersion: number;
  readonly contentHash: string;
  readonly document: ContentDocumentV1;
}
