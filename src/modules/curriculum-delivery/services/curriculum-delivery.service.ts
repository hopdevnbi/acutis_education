import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassScopeService } from '../../class/services/class-scope.service';
import { ClassService } from '../../class/services/class.service';
import { CurriculumVersionStatus } from '../../curriculum/enums/curriculum-version-status.enum';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { EnrollmentAccessService } from '../../enrollment/services/enrollment-access.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { documentReferencesMediaAsset } from '../../learning-content/utils/content-media-reference.util';
import { LearningContentService } from '../../learning-content/services/learning-content.service';
import { TranslationResourceType } from '../../localization/enums/translation-resource-type.enum';
import { LocalizationService } from '../../localization/services/localization.service';
import type { MediaAssetContent } from '../../media/interfaces/media-asset.interface';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { ParishService } from '../../parish/services/parish.service';
import { UserAccountService } from '../../users/services/user-account.service';
import {
  ContextualMediaAssetNotReferencedError,
  DraftCurriculumDeliveryDeniedError,
  LessonNotInAssignedCurriculumError,
} from '../errors/curriculum-delivery.errors';
import type {
  LearnerCurriculumTree,
  LearnerLessonContent,
} from '../interfaces/curriculum-delivery.interface';
import {
  attachTreeLocalizationKeys,
  buildCurriculumTreeLocalizationInputs,
  mergeLocalizedCurriculumTree,
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
    private readonly mediaAssetService: MediaAssetService,
    private readonly localizationService: LocalizationService,
    private readonly userAccountService: UserAccountService,
    private readonly parishService: ParishService,
  ) {}

  async getClassCurriculumTree(
    rawUserId: string,
    rawClassId: string,
    acceptLanguageHeader: string | null,
  ): Promise<LearnerCurriculumTree> {
    await this.classScopeService.assertCanReadClass(rawUserId, rawClassId);

    const classSnapshot = await this.classService.getClassById(rawClassId);

    return this.buildLearnerTreeForTriple(
      rawUserId,
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
      acceptLanguageHeader,
    );
  }

  async getEnrollmentCurriculumTree(
    rawUserId: string,
    rawEnrollmentId: string,
    acceptLanguageHeader: string | null,
  ): Promise<LearnerCurriculumTree> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);

    await this.enrollmentAccessService.assertCanReadEnrollment(
      rawUserId,
      enrollment.classId,
      enrollment.studentId,
    );

    const classSnapshot = await this.classService.getClassById(enrollment.classId);

    return this.buildLearnerTreeForTriple(
      rawUserId,
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
      acceptLanguageHeader,
    );
  }

  async getClassLessonContent(
    rawUserId: string,
    rawClassId: string,
    rawLessonId: string,
    acceptLanguageHeader: string | null,
  ): Promise<LearnerLessonContent> {
    await this.classScopeService.assertCanReadClass(rawUserId, rawClassId);

    const classSnapshot = await this.classService.getClassById(rawClassId);
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );

    return this.buildLearnerContentForAssignedVersion(
      rawUserId,
      classSnapshot.parishId,
      rawLessonId,
      assignedVersion.id,
      acceptLanguageHeader,
    );
  }

  async getEnrollmentLessonContent(
    rawUserId: string,
    rawEnrollmentId: string,
    rawLessonId: string,
    acceptLanguageHeader: string | null,
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
      rawUserId,
      classSnapshot.parishId,
      rawLessonId,
      assignedVersion.id,
      acceptLanguageHeader,
    );
  }

  async getClassLessonMediaContent(
    rawUserId: string,
    rawClassId: string,
    rawLessonId: string,
    rawAssetId: string,
  ): Promise<MediaAssetContent> {
    await this.classScopeService.assertCanReadClass(rawUserId, rawClassId);

    const classSnapshot = await this.classService.getClassById(rawClassId);
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );

    return this.resolveContextualLessonMediaContent(rawLessonId, assignedVersion.id, rawAssetId);
  }

  async getEnrollmentLessonMediaContent(
    rawUserId: string,
    rawEnrollmentId: string,
    rawLessonId: string,
    rawAssetId: string,
  ): Promise<MediaAssetContent> {
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

    return this.resolveContextualLessonMediaContent(rawLessonId, assignedVersion.id, rawAssetId);
  }

  private async buildLearnerTreeForTriple(
    rawUserId: string,
    parishId: string,
    academicYearId: string,
    catechismLevelId: string,
    acceptLanguageHeader: string | null,
  ): Promise<LearnerCurriculumTree> {
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      parishId,
      academicYearId,
      catechismLevelId,
    );
    const curriculum = await this.curriculumService.getCurriculumById(assignedVersion.curriculumId);
    const versionTree = await this.curriculumService.getVersionTree(assignedVersion.id);
    const localeResolution = await this.resolveLearnerLocale(
      rawUserId,
      parishId,
      acceptLanguageHeader,
    );
    const localizationInputs = buildCurriculumTreeLocalizationInputs({
      curriculumId: curriculum.id,
      versionId: assignedVersion.id,
      versionTree,
      targetLocale: localeResolution.resolvedLocale,
      requestedLocale: localeResolution.requestedLocale,
      parishId,
    });
    const resolutions =
      await this.localizationService.resolveLocalizedResources(localizationInputs);
    const resolutionMap = attachTreeLocalizationKeys(
      curriculum.id,
      assignedVersion.id,
      versionTree,
      resolutions,
    );

    return mergeLocalizedCurriculumTree(curriculum, assignedVersion, versionTree, {
      requestedLocale: localeResolution.requestedLocale,
      resolvedLocale: localeResolution.resolvedLocale,
      resolutionMap,
    });
  }

  private async buildLearnerContentForAssignedVersion(
    rawUserId: string,
    parishId: string,
    rawLessonId: string,
    assignedVersionId: string,
    acceptLanguageHeader: string | null,
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
    const localeResolution = await this.resolveLearnerLocale(
      rawUserId,
      parishId,
      acceptLanguageHeader,
    );
    const resolution = await this.localizationService.resolveLocalizedResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId: rawLessonId,
      targetLocale: localeResolution.resolvedLocale,
      requestedLocale: localeResolution.requestedLocale,
      parishId,
    });

    return toLearnerLessonContent(curriculum, assignedVersion, lessonContext, content, resolution);
  }

  private async resolveLearnerLocale(
    rawUserId: string,
    parishId: string,
    acceptLanguageHeader: string | null,
  ): Promise<{
    readonly requestedLocale: string | null;
    readonly resolvedLocale: string;
  }> {
    const account = await this.userAccountService.getAccountSnapshotById(rawUserId);
    const parish = await this.parishService.getParishById(parishId);
    const localeResolution = this.localizationService.resolveLocale({
      userPreferredLocale: account?.preferredLocale ?? null,
      acceptLanguageHeader,
      parishDefaultLocale: parish.defaultLocale,
    });

    return {
      requestedLocale: localeResolution.requestedLocale,
      resolvedLocale: localeResolution.resolvedLocale,
    };
  }

  private async resolveContextualLessonMediaContent(
    rawLessonId: string,
    assignedVersionId: string,
    rawAssetId: string,
  ): Promise<MediaAssetContent> {
    const lessonContext = await this.curriculumService.getLessonCurriculumContext(rawLessonId);

    if (lessonContext.versionStatus !== CurriculumVersionStatus.Published) {
      throw new DraftCurriculumDeliveryDeniedError();
    }

    if (normalizeUuid(lessonContext.curriculumVersionId) !== normalizeUuid(assignedVersionId)) {
      throw new LessonNotInAssignedCurriculumError();
    }

    const content = await this.learningContentService.getLessonContent(rawLessonId);

    if (!documentReferencesMediaAsset(content.document, rawAssetId)) {
      throw new ContextualMediaAssetNotReferencedError();
    }

    await this.mediaAssetService.assertAssetReady(rawAssetId);

    return this.mediaAssetService.openAssetContent(rawAssetId);
  }
}
