import type { CurriculumStatus } from '../enums/curriculum-status.enum';
import type { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';

export interface LessonSnapshot {
  readonly id: string;
  readonly curriculumVersionId: string;
  readonly topicId: string;
  readonly canonicalLessonKey: string;
  readonly code: string | null;
  readonly title: string;
  readonly summary: string | null;
  readonly sortOrder: number;
  readonly estimatedDurationMinutes: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateLessonInput {
  readonly code?: string | null;
  readonly title: string;
  readonly summary?: string | null;
  readonly estimatedDurationMinutes?: number | null;
  readonly sortOrder?: number;
}

export interface UpdateLessonInput {
  readonly code?: string | null;
  readonly title?: string;
  readonly summary?: string | null;
  readonly estimatedDurationMinutes?: number | null;
}

export interface ReorderLessonsInput {
  readonly lessonIds: string[];
}

export interface LessonCurriculumContext {
  readonly lessonId: string;
  readonly topicId: string;
  readonly curriculumVersionId: string;
  readonly curriculumId: string;
  readonly parishId: string;
  readonly canonicalLessonKey: string;
  readonly versionStatus: CurriculumVersionStatus;
  readonly curriculumStatus: CurriculumStatus;
}
