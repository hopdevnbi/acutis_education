import type { ClassSnapshot } from '../../class/interfaces/class.interface';
import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import type { StudentSnapshot } from '../../student/interfaces/student.interface';
import type {
  ParentPortalChildEnrollmentSnapshot,
  ParentPortalChildrenSnapshot,
} from '../interfaces/parent-portal.interface';

interface BuildParentPortalChildrenSnapshotInput {
  readonly studentSnapshots: readonly StudentSnapshot[];
  readonly activeEnrollments: readonly EnrollmentSnapshot[];
  readonly classSnapshotsById: ReadonlyMap<string, ClassSnapshot>;
}

export function buildParentPortalChildrenSnapshot(
  input: BuildParentPortalChildrenSnapshotInput,
): ParentPortalChildrenSnapshot {
  const enrollmentsByStudentId = new Map<string, EnrollmentSnapshot[]>();

  for (const enrollment of input.activeEnrollments) {
    const existingEnrollments = enrollmentsByStudentId.get(enrollment.studentId) ?? [];
    existingEnrollments.push(enrollment);
    enrollmentsByStudentId.set(enrollment.studentId, existingEnrollments);
  }

  return {
    items: input.studentSnapshots.map((studentSnapshot) => ({
      studentId: studentSnapshot.id,
      displayName: studentSnapshot.fullName,
      studentStatus: studentSnapshot.status,
      activeEnrollments: (enrollmentsByStudentId.get(studentSnapshot.id) ?? [])
        .map((enrollment): ParentPortalChildEnrollmentSnapshot | null => {
          const classSnapshot = input.classSnapshotsById.get(enrollment.classId);

          if (classSnapshot === undefined) {
            return null;
          }

          return {
            enrollmentId: enrollment.id,
            classId: enrollment.classId,
            className: classSnapshot.name,
            parishId: enrollment.parishId,
            academicYearId: enrollment.academicYearId,
            catechismLevelId: classSnapshot.catechismLevelId,
          };
        })
        .filter((item): item is ParentPortalChildEnrollmentSnapshot => item !== null),
    })),
  };
}
