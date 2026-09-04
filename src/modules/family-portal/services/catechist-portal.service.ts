import { Injectable } from '@nestjs/common';
import { ClassService } from '../../class/services/class.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ExamService } from '../../exam/services/exam.service';
import { LEARNING_PROGRESS_DEFAULT_PAGE } from '../../learning-progress/constants/learning-progress.constants';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service';
import { StudentService } from '../../student/services/student.service';
import {
  FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_LIMIT,
  FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_PAGE,
  FAMILY_PORTAL_CATECHIST_CLASSES_MAX_LIMIT,
} from '../constants/family-portal.constants';
import type {
  CatechistPortalClassListSnapshot,
  CatechistPortalClassRosterSnapshot,
  CatechistPortalContextSnapshot,
  GetCatechistClassRosterInput,
  ListCatechistClassesInput,
} from '../interfaces/catechist-portal.interface';
import { toCatechistPortalClassRosterSnapshot } from '../mappers/catechist-portal.mapper';
import { FamilyPortalAccessService } from './family-portal-access.service';

@Injectable()
export class CatechistPortalService {
  constructor(
    private readonly familyPortalAccessService: FamilyPortalAccessService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly classService: ClassService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly learningProgressService: LearningProgressService,
    private readonly examService: ExamService,
    private readonly studentService: StudentService,
  ) {}

  async getContext(rawActorUserId: string): Promise<CatechistPortalContextSnapshot> {
    await this.familyPortalAccessService.assertCatechistActor(rawActorUserId);

    const assignedClassIds = (
      await this.classCatechistAssignmentService.listAssignedClassIds(rawActorUserId)
    ).toSorted();

    if (assignedClassIds.length === 0) {
      return {
        actorUserId: rawActorUserId,
        assignedClassCount: 0,
        parishIds: [],
      };
    }

    const classSnapshots = await this.classService.getClassSnapshotsByIds(assignedClassIds);
    const parishIds = [
      ...new Set(classSnapshots.map((classSnapshot) => classSnapshot.parishId)),
    ].toSorted();

    return {
      actorUserId: rawActorUserId,
      assignedClassCount: assignedClassIds.length,
      parishIds,
    };
  }

  async listClasses(input: ListCatechistClassesInput): Promise<CatechistPortalClassListSnapshot> {
    await this.familyPortalAccessService.assertCatechistActor(input.actorUserId);

    const page = input.page ?? FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_PAGE;
    const limit = Math.min(
      input.limit ?? FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_LIMIT,
      FAMILY_PORTAL_CATECHIST_CLASSES_MAX_LIMIT,
    );
    const assignedClassIds = (
      await this.classCatechistAssignmentService.listAssignedClassIds(input.actorUserId)
    ).toSorted();
    const total = assignedClassIds.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const pageClassIds = assignedClassIds.slice(offset, offset + limit);

    if (pageClassIds.length === 0) {
      return {
        items: [],
        page,
        limit,
        total,
        totalPages,
      };
    }

    const [classSnapshots, activeEnrollmentCountsByClassId] = await Promise.all([
      this.classService.getClassSnapshotsByIds(pageClassIds),
      this.enrollmentQueryService.countActiveEnrollmentsByClassIds(pageClassIds),
    ]);
    const classSnapshotsById = new Map(
      classSnapshots.map((classSnapshot) => [classSnapshot.id, classSnapshot]),
    );

    const items = pageClassIds
      .map((classId) => {
        const classSnapshot = classSnapshotsById.get(classId);

        if (classSnapshot === undefined) {
          return null;
        }

        return {
          classId: classSnapshot.id,
          className: classSnapshot.name,
          classCode: classSnapshot.code,
          parishId: classSnapshot.parishId,
          academicYearId: classSnapshot.academicYearId,
          catechismLevelId: classSnapshot.catechismLevelId,
          classStatus: classSnapshot.status,
          activeEnrollmentCount: activeEnrollmentCountsByClassId.get(classId) ?? 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items,
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getClassRoster(
    input: GetCatechistClassRosterInput,
  ): Promise<CatechistPortalClassRosterSnapshot> {
    await this.familyPortalAccessService.assertCatechistAssignedToClass(
      input.actorUserId,
      input.classId,
    );

    const classProgress = await this.learningProgressService.getClassLearningProgress({
      classId: input.classId,
      actorUserId: input.actorUserId,
      page: input.page ?? LEARNING_PROGRESS_DEFAULT_PAGE,
      limit: input.limit,
      curriculumId: input.curriculumId,
      canonicalLessonKey: input.canonicalLessonKey,
    });
    const enrollmentIds = classProgress.learners.items.map((learner) => learner.enrollmentId);
    const studentIds = classProgress.learners.items.map((learner) => learner.studentId);

    const [examSummariesByEnrollmentId, studentSnapshots, enrollmentSnapshots] = await Promise.all([
      this.examService.getEnrollmentExamSummariesByEnrollmentIds(enrollmentIds),
      this.studentService.getStudentSnapshotsByIds(studentIds),
      this.enrollmentQueryService.getEnrollmentSnapshotsByIds(enrollmentIds),
    ]);
    const studentSnapshotsById = new Map(
      studentSnapshots.map((studentSnapshot) => [studentSnapshot.id, studentSnapshot]),
    );
    const enrollmentSnapshotsById = new Map(
      enrollmentSnapshots.map((enrollmentSnapshot) => [enrollmentSnapshot.id, enrollmentSnapshot]),
    );

    return toCatechistPortalClassRosterSnapshot({
      classProgress,
      examSummariesByEnrollmentId,
      studentSnapshotsById,
      enrollmentSnapshotsById,
    });
  }
}
