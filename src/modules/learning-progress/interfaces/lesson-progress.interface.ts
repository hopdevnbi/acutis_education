import type {
  LessonProgressStatus,
  LessonProgressTargetStatus,
} from '../enums/lesson-progress-status.enum';

export interface LessonProgressSnapshot {
  readonly id: string | null;
  readonly enrollmentId: string;
  readonly curriculumId: string;
  readonly canonicalLessonKey: string;
  readonly assignedCurriculumVersionId: string | null;
  readonly status: LessonProgressStatus;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
}

export interface GetLessonProgressInput {
  readonly enrollmentId: string;
  readonly canonicalLessonKey: string;
}

export interface SetLessonProgressInput {
  readonly enrollmentId: string;
  readonly canonicalLessonKey: string;
  readonly targetStatus: LessonProgressTargetStatus;
  readonly actorUserId: string;
}

export interface ListEnrollmentLessonProgressInput {
  readonly enrollmentId: string;
  readonly curriculumId?: string;
}

export interface ResolvedLessonProgressContext {
  readonly enrollmentId: string;
  readonly curriculumId: string;
  readonly assignedCurriculumVersionId: string;
  readonly canonicalLessonKey: string;
}
