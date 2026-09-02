import type { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type { EnrollmentLearningProgressSnapshot } from '../../learning-progress/interfaces/learning-progress.interface';
import type { StudentStatus } from '../../student/enums/student-status.enum';

export interface ParentPortalContextSnapshot {
  readonly actorUserId: string;
  readonly linkedChildCount: number;
  readonly activeEnrollmentCount: number;
}

export interface ParentPortalChildEnrollmentSnapshot {
  readonly enrollmentId: string;
  readonly classId: string;
  readonly className: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly catechismLevelId: string;
}

export interface ParentPortalChildSnapshot {
  readonly studentId: string;
  readonly displayName: string;
  readonly studentStatus: StudentStatus;
  readonly activeEnrollments: readonly ParentPortalChildEnrollmentSnapshot[];
}

export interface ParentPortalChildrenSnapshot {
  readonly items: readonly ParentPortalChildSnapshot[];
}

export interface ParentPortalEnrollmentProgressSnapshot {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly enrollmentStatus: EnrollmentStatus;
  readonly progress: EnrollmentLearningProgressSnapshot;
}

export interface GetParentEnrollmentProgressInput {
  readonly actorUserId: string;
  readonly enrollmentId: string;
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
}
