import type { EnrollmentSnapshot } from './enrollment.interface';

export interface LinkedStudentLearnerContext {
  readonly studentId: string;
  readonly fullName: string;
  readonly activeEnrollments: readonly EnrollmentSnapshot[];
}

export interface LearnerContextSnapshot {
  readonly linkedStudents: readonly LinkedStudentLearnerContext[];
}
