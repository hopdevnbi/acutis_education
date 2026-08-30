import type { CurriculumStatus } from '../enums/curriculum-status.enum';
import type { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';
import type {
  CURRICULUM_SORT_DIRECTIONS,
  CURRICULUM_SORT_FIELDS,
} from '../constants/curriculum-list.constants';

export interface CurriculumSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly catechismLevelId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: CurriculumStatus;
  readonly sourceLocale: string;
  readonly currentPublishedVersionId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CurriculumVersionSnapshot {
  readonly id: string;
  readonly curriculumId: string;
  readonly versionNumber: number;
  readonly status: CurriculumVersionStatus;
  readonly label: string | null;
  readonly publishedAt: Date | null;
  readonly publishedByUserId: string | null;
  readonly createdByUserId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCurriculumInput {
  readonly catechismLevelId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly sourceLocale: string;
}

export interface UpdateCurriculumInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly sourceLocale?: string;
}

export interface ListCurriculaInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: (typeof CURRICULUM_SORT_FIELDS)[number];
  readonly sort: (typeof CURRICULUM_SORT_DIRECTIONS)[number];
  readonly catechismLevelId?: string;
  readonly status?: CurriculumStatus;
  readonly sourceLocale?: string;
  readonly search?: string;
}

export interface ListCurriculaResult {
  readonly items: CurriculumSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface CreateCurriculumVersionInput {
  readonly label?: string | null;
  readonly createdByUserId: string;
}

export interface ListCurriculumVersionsInput {
  readonly status?: CurriculumVersionStatus;
}

export interface UpdateCurriculumVersionInput {
  readonly label?: string | null;
}

export interface VersionTreeLessonSnapshot {
  readonly id: string;
  readonly canonicalLessonKey: string;
  readonly code: string | null;
  readonly title: string;
  readonly summary: string | null;
  readonly sortOrder: number;
  readonly estimatedDurationMinutes: number | null;
}

export interface VersionTreeTopicSnapshot {
  readonly id: string;
  readonly code: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly lessons: VersionTreeLessonSnapshot[];
}

export interface VersionTreeSnapshot {
  readonly version: CurriculumVersionSnapshot;
  readonly topics: VersionTreeTopicSnapshot[];
}

export interface CurriculumAssignmentSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly catechismLevelId: string;
  readonly curriculumVersionId: string;
  readonly assignedByUserId: string | null;
  readonly assignedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpsertCurriculumAssignmentInput {
  readonly curriculumVersionId: string;
  readonly assignedByUserId: string;
}
