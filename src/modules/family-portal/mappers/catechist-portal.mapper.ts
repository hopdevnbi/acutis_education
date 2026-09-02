import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type { EnrollmentExamSummarySnapshot } from '../../exam/interfaces/exam.interface';
import type { ClassLearningProgressSnapshot } from '../../learning-progress/interfaces/learning-progress.interface';
import type { StudentSnapshot } from '../../student/interfaces/student.interface';
import type { CatechistPortalClassRosterSnapshot } from '../interfaces/catechist-portal.interface';

interface ToCatechistPortalClassRosterSnapshotInput {
  readonly classProgress: ClassLearningProgressSnapshot;
  readonly examSummariesByEnrollmentId: ReadonlyMap<string, EnrollmentExamSummarySnapshot>;
  readonly studentSnapshotsById: ReadonlyMap<string, StudentSnapshot>;
  readonly enrollmentSnapshotsById: ReadonlyMap<string, EnrollmentSnapshot>;
}

export function toCatechistPortalClassRosterSnapshot(
  input: ToCatechistPortalClassRosterSnapshotInput,
): CatechistPortalClassRosterSnapshot {
  return {
    classId: input.classProgress.classId,
    filters: input.classProgress.filters,
    summary: input.classProgress.summary,
    learners: {
      page: input.classProgress.learners.page,
      limit: input.classProgress.learners.limit,
      total: input.classProgress.learners.total,
      totalPages: input.classProgress.learners.totalPages,
      items: input.classProgress.learners.items.map((learnerRow) => {
        const studentSnapshot = input.studentSnapshotsById.get(learnerRow.studentId);
        const enrollmentSnapshot = input.enrollmentSnapshotsById.get(learnerRow.enrollmentId);
        const examSummary = input.examSummariesByEnrollmentId.get(learnerRow.enrollmentId);

        return {
          studentId: learnerRow.studentId,
          enrollmentId: learnerRow.enrollmentId,
          displayName: studentSnapshot?.fullName ?? 'Unknown learner',
          enrollmentStatus: enrollmentSnapshot?.status ?? EnrollmentStatus.Active,
          learning: { ...learnerRow.learning },
          practice: learnerRow.practice,
          exam: examSummary ?? {
            assignmentsAvailable: 0,
            attemptsCompleted: 0,
            latestScorePercent: null,
          },
          lastLearningActivityAt: learnerRow.lastLearningActivityAt,
        };
      }),
    },
  };
}
