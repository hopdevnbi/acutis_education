import type { ClassStatus } from '../../class/enums/class-status.enum';
import type { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type {
  ClassLearningProgressSummary,
  LearningProgressFilters,
  LearningProgressPracticeSnapshot,
} from '../../learning-progress/interfaces/learning-progress.interface';
import type { EnrollmentExamSummarySnapshot } from '../../exam/interfaces/exam.interface';

export interface CatechistPortalContextSnapshot {
  readonly actorUserId: string;
  readonly assignedClassCount: number;
  readonly parishIds: readonly string[];
}

export interface CatechistPortalClassSummarySnapshot {
  readonly classId: string;
  readonly className: string;
  readonly classCode: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly catechismLevelId: string;
  readonly classStatus: ClassStatus;
  readonly activeEnrollmentCount: number;
}

export interface CatechistPortalClassListSnapshot {
  readonly items: readonly CatechistPortalClassSummarySnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface CatechistPortalRosterLearnerSnapshot {
  readonly studentId: string;
  readonly enrollmentId: string;
  readonly displayName: string;
  readonly enrollmentStatus: EnrollmentStatus;
  readonly learning: {
    readonly lessonsAssigned: number;
    readonly lessonsStarted: number;
    readonly lessonsCompleted: number;
    readonly completionRatio: number;
  };
  readonly practice: LearningProgressPracticeSnapshot;
  readonly exam: EnrollmentExamSummarySnapshot;
  readonly lastLearningActivityAt: Date | null;
}

export interface CatechistPortalClassRosterSnapshot {
  readonly classId: string;
  readonly filters: LearningProgressFilters;
  readonly summary: ClassLearningProgressSummary;
  readonly learners: {
    readonly items: readonly CatechistPortalRosterLearnerSnapshot[];
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface ListCatechistClassesInput {
  readonly actorUserId: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface GetCatechistClassRosterInput {
  readonly actorUserId: string;
  readonly classId: string;
  readonly page?: number;
  readonly limit?: number;
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
}
