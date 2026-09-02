import { Injectable } from '@nestjs/common';
import { ClassService } from '../../class/services/class.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service';
import { StudentService } from '../../student/services/student.service';
import type {
  GetParentEnrollmentProgressInput,
  ParentPortalChildrenSnapshot,
  ParentPortalContextSnapshot,
  ParentPortalEnrollmentProgressSnapshot,
} from '../interfaces/parent-portal.interface';
import { buildParentPortalChildrenSnapshot } from '../mappers/parent-portal.mapper';
import { FamilyPortalAccessService } from './family-portal-access.service';

@Injectable()
export class ParentPortalService {
  constructor(
    private readonly familyPortalAccessService: FamilyPortalAccessService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentService: StudentService,
    private readonly classService: ClassService,
    private readonly learningProgressService: LearningProgressService,
  ) {}

  async getContext(rawActorUserId: string): Promise<ParentPortalContextSnapshot> {
    await this.familyPortalAccessService.assertParentActor(rawActorUserId);

    const linkedStudentIds =
      await this.enrollmentQueryService.listStudentIdsForGuardian(rawActorUserId);

    if (linkedStudentIds.length === 0) {
      return {
        actorUserId: rawActorUserId,
        linkedChildCount: 0,
        activeEnrollmentCount: 0,
      };
    }

    const activeEnrollments =
      await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds(linkedStudentIds);

    return {
      actorUserId: rawActorUserId,
      linkedChildCount: linkedStudentIds.length,
      activeEnrollmentCount: activeEnrollments.length,
    };
  }

  async listChildren(rawActorUserId: string): Promise<ParentPortalChildrenSnapshot> {
    await this.familyPortalAccessService.assertParentActor(rawActorUserId);

    const linkedStudentIds =
      await this.enrollmentQueryService.listStudentIdsForGuardian(rawActorUserId);

    if (linkedStudentIds.length === 0) {
      return { items: [] };
    }

    const [studentSnapshots, activeEnrollments] = await Promise.all([
      this.studentService.getStudentSnapshotsByIds(linkedStudentIds),
      this.enrollmentQueryService.listActiveEnrollmentsByStudentIds(linkedStudentIds),
    ]);
    const classIds = [...new Set(activeEnrollments.map((enrollment) => enrollment.classId))];
    const classSnapshots = await this.classService.getClassSnapshotsByIds(classIds);
    const classSnapshotsById = new Map(
      classSnapshots.map((classSnapshot) => [classSnapshot.id, classSnapshot]),
    );
    const studentSnapshotsById = new Map(
      studentSnapshots.map((studentSnapshot) => [studentSnapshot.id, studentSnapshot]),
    );

    return buildParentPortalChildrenSnapshot({
      studentSnapshots: linkedStudentIds
        .map((studentId) => studentSnapshotsById.get(studentId))
        .filter((studentSnapshot) => studentSnapshot !== undefined),
      activeEnrollments,
      classSnapshotsById,
    });
  }

  async getEnrollmentProgress(
    input: GetParentEnrollmentProgressInput,
  ): Promise<ParentPortalEnrollmentProgressSnapshot> {
    const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);

    await this.familyPortalAccessService.assertGuardianLinkedToStudent(
      input.actorUserId,
      enrollment.studentId,
    );

    const progress = await this.learningProgressService.getEnrollmentLearningProgress({
      enrollmentId: input.enrollmentId,
      actorUserId: input.actorUserId,
      curriculumId: input.curriculumId,
      canonicalLessonKey: input.canonicalLessonKey,
    });

    return {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      enrollmentStatus: enrollment.status,
      progress,
    };
  }
}
