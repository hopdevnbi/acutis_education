import type {
  EXAM_ASSIGNMENT_SORT_FIELDS,
  EXAM_SORT_DIRECTIONS,
  EXAM_SORT_FIELDS,
} from '../constants/exam-list.constants';
import type { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';
import type { ExamStatus } from '../enums/exam-status.enum';
import type { ExamVersionStatus } from '../enums/exam-version-status.enum';
import type { ExamReviewPolicy } from '../constants/exam-review-policy.constants';

export interface ExamSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly code: string;
  readonly status: ExamStatus;
  readonly currentPublishedVersionId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ExamVersionSnapshot {
  readonly id: string;
  readonly examId: string;
  readonly versionNumber: number;
  readonly title: string;
  readonly description: string | null;
  readonly instructions: string | null;
  readonly sourceLocale: string;
  readonly durationMinutes: number;
  readonly maxAttempts: number;
  readonly passingScorePercent: string | null;
  readonly shuffleQuestions: boolean;
  readonly shuffleOptions: boolean;
  readonly reviewPolicy: ExamReviewPolicy;
  readonly status: ExamVersionStatus;
  readonly publishedAt: Date | null;
  readonly publishedByUserId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ExamVersionQuestionSnapshot {
  readonly id: string;
  readonly examVersionId: string;
  readonly questionId: string;
  readonly questionVersionId: string | null;
  readonly sortOrder: number;
  readonly createdAt: Date;
}

export interface ExamAssignmentSnapshot {
  readonly id: string;
  readonly examVersionId: string;
  readonly classId: string;
  readonly opensAt: Date;
  readonly closesAt: Date;
  readonly status: ExamAssignmentStatus;
  readonly effectiveStatus: ExamAssignmentStatus;
  readonly createdByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateExamInput {
  readonly code: string;
}

export interface UpdateExamInput {
  readonly code?: string;
}

export interface ListExamsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: (typeof EXAM_SORT_FIELDS)[number];
  readonly sort: (typeof EXAM_SORT_DIRECTIONS)[number];
  readonly status?: ExamStatus;
  readonly search?: string;
}

export interface ListExamsResult {
  readonly items: ExamSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface CreateExamVersionInput {
  readonly title: string;
  readonly description?: string | null;
  readonly instructions?: string | null;
  readonly sourceLocale: string;
  readonly durationMinutes: number;
  readonly maxAttempts: number;
  readonly passingScorePercent?: string | null;
  readonly shuffleQuestions: boolean;
  readonly shuffleOptions: boolean;
  readonly reviewPolicy?: ExamReviewPolicy;
}

export interface UpdateExamVersionInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly instructions?: string | null;
  readonly sourceLocale?: string;
  readonly durationMinutes?: number;
  readonly maxAttempts?: number;
  readonly passingScorePercent?: string | null;
  readonly shuffleQuestions?: boolean;
  readonly shuffleOptions?: boolean;
  readonly reviewPolicy?: ExamReviewPolicy;
}

export interface ListExamVersionsInput {
  readonly status?: ExamVersionStatus;
}

export interface ReplaceExamVersionQuestionsInput {
  readonly questionIds: readonly string[];
}

export interface CreateExamAssignmentInput {
  readonly examVersionId: string;
  readonly opensAt: Date;
  readonly closesAt: Date;
}

export interface UpdateExamAssignmentInput {
  readonly opensAt?: Date;
  readonly closesAt?: Date;
  readonly status?: ExamAssignmentStatus;
}

export interface ListExamAssignmentsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: (typeof EXAM_ASSIGNMENT_SORT_FIELDS)[number];
  readonly sort: (typeof EXAM_SORT_DIRECTIONS)[number];
  readonly status?: ExamAssignmentStatus;
}

export interface ListExamAssignmentsResult {
  readonly items: ExamAssignmentSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ExamPublishValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly resourceId?: string;
  readonly path?: string;
}
