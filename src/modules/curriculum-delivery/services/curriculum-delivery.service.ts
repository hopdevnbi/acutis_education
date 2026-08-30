import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassScopeService } from '../../class/services/class-scope.service';
import { ClassService } from '../../class/services/class.service';
import { CurriculumVersionStatus } from '../../curriculum/enums/curriculum-version-status.enum';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { EnrollmentAccessService } from '../../enrollment/services/enrollment-access.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { LearningContentService } from '../../learning-content/services/learning-content.service';
import {
  DraftCurriculumDeliveryDeniedError,
  LessonNotInAssignedCurriculumError,
} from '../errors/curriculum-delivery.errors';
import type {
  LearnerCurriculumTree,
  LearnerLessonContent,
} from '../interfaces/curriculum-delivery.interface';
import {
  toLearnerCurriculumTree,
  toLearnerLessonContent,
} from '../mappers/curriculum-delivery.mapper';

@Injectable()
export class CurriculumDeliveryService {
  constructor(
    private readonly classService: ClassService,
    private readonly classScopeService: ClassScopeService,
    private readonly enrollmentService: EnrollmentService,
    private readonly enrollmentAccessService: EnrollmentAccessService,
    private readonly curriculumService: CurriculumService,
    private readonly learningContentService: LearningContentService,
  ) {}

  async getClassCurriculumTree(
    rawUserId: string,
    rawClassId: string,
  ): Promise<LearnerCurriculumTree> {
    await this.classScopeService.assertCanReadClass(rawUserId, rawClassId);

    const classSnapshot = await this.classService.getClassById(rawClassId);

    return this.buildLearnerTreeForTriple(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );
  }

  async getEnrollmentCurriculumTree(
    rawUserId: string,
    rawEnrollmentId: string,
  ): Promise<LearnerCurriculumTree> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);

    await this.enrollmentAccessService.assertCanReadEnrollment(
      rawUserId,
      enrollment.classId,
      enrollment.studentId,
    );

    const classSnapshot = await this.classService.getClassById(enrollment.classId);

    return this.buildLearnerTreeForTriple(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );
  }

  async getClassLessonContent(
    rawUserId: string,
    rawClassId: string,
    rawLessonId: string,
    requestedLocale: string | null,
  ): Promise<LearnerLessonContent> {
    await this.classScopeService.assertCanReadClass(rawUserId, rawClassId);

    const classSnapshot = await this.classService.getClassById(rawClassId);
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );

    return this.buildLearnerContentForAssignedVersion(
      rawLessonId,
      assignedVersion.id,
      requestedLocale,
    );
  }

  async getEnrollmentLessonContent(
    rawUserId: string,
    rawEnrollmentId: string,
    rawLessonId: string,
    requestedLocale: string | null,
  ): Promise<LearnerLessonContent> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);

    await this.enrollmentAccessService.assertCanReadEnrollment(
      rawUserId,
      enrollment.classId,
      enrollment.studentId,
    );

    const classSnapshot = await this.classService.getClassById(enrollment.classId);
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );

    return this.buildLearnerContentForAssignedVersion(
      rawLessonId,
      assignedVersion.id,
      requestedLocale,
    );
  }

  private async buildLearnerTreeForTriple(
    parishId: string,
    academicYearId: string,
    catechismLevelId: string,
  ): Promise<LearnerCurriculumTree> {
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      parishId,
      academicYearId,
      catechismLevelId,
    );
    const curriculum = await this.curriculumService.getCurriculumById(assignedVersion.curriculumId);
    const versionTree = await this.curriculumService.getVersionTree(assignedVersion.id);

    return toLearnerCurriculumTree(curriculum, assignedVersion, versionTree);
  }

  private async buildLearnerContentForAssignedVersion(
    rawLessonId: string,
    assignedVersionId: string,
    requestedLocale: string | null,
  ): Promise<LearnerLessonContent> {
    const lessonContext = await this.curriculumService.getLessonCurriculumContext(rawLessonId);

    if (lessonContext.versionStatus !== CurriculumVersionStatus.Published) {
      throw new DraftCurriculumDeliveryDeniedError();
    }

    if (normalizeUuid(lessonContext.curriculumVersionId) !== normalizeUuid(assignedVersionId)) {
      throw new LessonNotInAssignedCurriculumError();
    }

    const assignedVersion = await this.curriculumService.assertVersionPublished(assignedVersionId);
    const curriculum = await this.curriculumService.getCurriculumById(lessonContext.curriculumId);
    const content = await this.learningContentService.getLessonContent(rawLessonId);

    return toLearnerLessonContent(
      curriculum,
      assignedVersion,
      lessonContext,
      content,
      requestedLocale,
    );
  }
}
