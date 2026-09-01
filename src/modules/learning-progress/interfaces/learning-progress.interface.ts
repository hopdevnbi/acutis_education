import {
  LessonProgressStatus,
  type LessonProgressTargetStatus,
} from '../enums/lesson-progress-status.enum';

export interface LearningProgressFilters {
  readonly curriculumId: string | null;
  readonly canonicalLessonKey: string | null;
}

export interface LearningDimensionMetrics {
  readonly curriculumId: string;
  readonly assignedCurriculumVersionId: string;
  readonly lessonsAssigned: number;
  readonly lessonsStarted: number;
  readonly lessonsCompleted: number;
  readonly completionRatio: number;
}

export interface EnrollmentLessonStateSnapshot {
  readonly canonicalLessonKey: string;
  readonly status: LessonProgressStatus;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
}

export interface LearningProgressPracticeStandardMetrics {
  readonly sessionsCompleted: number;
  readonly questionsAttempted: number;
  readonly firstAttemptCorrect: number;
  readonly finalCorrect: number;
  readonly firstAttemptAccuracy: number;
  readonly finalAccuracy: number;
}

export interface LearningProgressPracticeReviewMetrics {
  readonly sessionsCompleted: number;
  readonly questionsAttempted: number;
  readonly finalCorrect: number;
  readonly finalAccuracy: number;
  readonly uniqueQuestionVersionsReviewed: number;
}

export interface LearningProgressPracticeSnapshot {
  readonly standard: LearningProgressPracticeStandardMetrics;
  readonly review: LearningProgressPracticeReviewMetrics;
  readonly lastPracticedAt: Date | null;
}

export interface EnrollmentLearningProgressSnapshot {
  readonly enrollmentId: string;
  readonly filters: LearningProgressFilters;
  readonly learning: LearningDimensionMetrics;
  readonly lessons: readonly EnrollmentLessonStateSnapshot[];
  readonly practice: LearningProgressPracticeSnapshot;
  readonly exam: null;
  readonly lastLearningActivityAt: Date | null;
}

export interface ClassLearningProgressLearnerRow {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly learning: Omit<LearningDimensionMetrics, 'curriculumId' | 'assignedCurriculumVersionId'>;
  readonly practice: LearningProgressPracticeSnapshot;
  readonly lastLearningActivityAt: Date | null;
}

export interface ClassLearningProgressSummary {
  readonly learnersTotal: number;
  readonly learnersWithLearningActivity: number;
  readonly lessonAssignmentsTotal: number;
  readonly lessonsStarted: number;
  readonly lessonsCompleted: number;
  readonly completionRatio: number;
  readonly practice: LearningProgressPracticeSnapshot;
  readonly lastLearningActivityAt: Date | null;
}

export interface ClassLearningProgressSnapshot {
  readonly classId: string;
  readonly filters: LearningProgressFilters;
  readonly summary: ClassLearningProgressSummary;
  readonly learners: {
    readonly items: readonly ClassLearningProgressLearnerRow[];
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface PatchLessonProgressInput {
  readonly enrollmentId: string;
  readonly canonicalLessonKey: string;
  readonly status: LessonProgressTargetStatus;
  readonly actorUserId: string;
}

export interface GetEnrollmentLearningProgressInput {
  readonly enrollmentId: string;
  readonly actorUserId: string;
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
}

export interface GetClassLearningProgressInput {
  readonly classId: string;
  readonly actorUserId: string;
  readonly page?: number;
  readonly limit?: number;
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
}
