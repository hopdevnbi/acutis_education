import { Injectable, Logger } from '@nestjs/common';
import { AcademicYearStatus } from '../../modules/academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../modules/academic-structure/services/catechism-level.service';
import { CurriculumVersionStatus } from '../../modules/curriculum/enums/curriculum-version-status.enum';
import {
  CurriculumCodeAlreadyExistsError,
  CurriculumDraftAlreadyExistsError,
} from '../../modules/curriculum/errors/curriculum.errors';
import { LessonCodeAlreadyExistsError } from '../../modules/curriculum/errors/lesson.errors';
import { TopicCodeAlreadyExistsError } from '../../modules/curriculum/errors/topic.errors';
import type {
  CurriculumAssignmentSnapshot,
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
} from '../../modules/curriculum/interfaces/curriculum.interface';
import type { LessonSnapshot } from '../../modules/curriculum/interfaces/lesson.interface';
import type { TopicSnapshot } from '../../modules/curriculum/interfaces/topic.interface';
import { CurriculumService } from '../../modules/curriculum/services/curriculum.service';
import { LessonService } from '../../modules/curriculum/services/lesson.service';
import { TopicService } from '../../modules/curriculum/services/topic.service';
import { CurriculumVersionOrchestrationService } from '../../modules/curriculum-orchestration/services/curriculum-version-orchestration.service';
import { LearningContentService } from '../../modules/learning-content/services/learning-content.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import {
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
  PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
} from './parish-academic.seed.constants';
import {
  buildCurriculumDemoContentDocument,
  CURRICULUM_DEMO_CURRICULUM_CODE,
  CURRICULUM_DEMO_CURRICULUM_DESCRIPTION,
  CURRICULUM_DEMO_CURRICULUM_NAME,
  CURRICULUM_DEMO_LEVEL_CODE,
  CURRICULUM_DEMO_SEED_ADMIN_EMAIL,
  CURRICULUM_DEMO_SOURCE_LOCALE,
  CURRICULUM_DEMO_TOPICS,
  CURRICULUM_DEMO_VERSION_LABEL,
  type CurriculumDemoSeedLessonDefinition,
  type CurriculumDemoSeedTopicDefinition,
} from './curriculum-demo.seed.constants';

export class CurriculumDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurriculumDemoSeedPrerequisiteError';
  }
}

export interface CurriculumDemoSeedSummary {
  curriculumCreated: boolean;
  curriculumExisting: boolean;
  draftVersionCreated: boolean;
  draftVersionExisting: boolean;
  topicsCreated: number;
  topicsExisting: number;
  lessonsCreated: number;
  lessonsExisting: number;
  lessonContentsUpserted: number;
  versionPublished: boolean;
  versionAlreadyPublished: boolean;
  assignmentCreated: boolean;
  assignmentExisting: boolean;
}

@Injectable()
export class CurriculumDemoSeedService {
  private readonly logger = new Logger(CurriculumDemoSeedService.name);

  constructor(
    private readonly parishService: ParishService,
    private readonly academicYearService: AcademicYearService,
    private readonly catechismLevelService: CatechismLevelService,
    private readonly userAccountService: UserAccountService,
    private readonly curriculumService: CurriculumService,
    private readonly topicService: TopicService,
    private readonly lessonService: LessonService,
    private readonly learningContentService: LearningContentService,
    private readonly curriculumVersionOrchestrationService: CurriculumVersionOrchestrationService,
  ) {}

  async run(): Promise<CurriculumDemoSeedSummary> {
    const summary: CurriculumDemoSeedSummary = {
      curriculumCreated: false,
      curriculumExisting: false,
      draftVersionCreated: false,
      draftVersionExisting: false,
      topicsCreated: 0,
      topicsExisting: 0,
      lessonsCreated: 0,
      lessonsExisting: 0,
      lessonContentsUpserted: 0,
      versionPublished: false,
      versionAlreadyPublished: false,
      assignmentCreated: false,
      assignmentExisting: false,
    };

    const parish = await this.findDemoParish();
    const academicYear = await this.findActiveDemoAcademicYear(parish.id);
    const catechismLevel = await this.findDemoCatechismLevel(parish.id);
    const adminUser = await this.requireSeedUser(
      CURRICULUM_DEMO_SEED_ADMIN_EMAIL,
      'npm run seed:auth-rbac',
    );

    const curriculum = await this.ensureCurriculum(parish.id, catechismLevel.id, summary);

    if (curriculum.currentPublishedVersionId !== null) {
      summary.versionAlreadyPublished = true;
      this.logger.log(
        `Demo curriculum ${CURRICULUM_DEMO_CURRICULUM_CODE} already published; ensuring assignment only.`,
      );

      await this.ensureAssignment(
        parish.id,
        academicYear.id,
        catechismLevel.id,
        curriculum.currentPublishedVersionId,
        adminUser.id,
        summary,
      );

      return summary;
    }

    const draftVersion = await this.ensureDraftVersion(curriculum.id, adminUser.id, summary);
    await this.ensureStructure(draftVersion.id, summary);
    const publishedVersion = await this.curriculumVersionOrchestrationService.publishVersion(
      draftVersion.id,
      adminUser.id,
    );
    summary.versionPublished = true;
    this.logger.log(
      `Published demo curriculum version ${String(publishedVersion.versionNumber)} (${publishedVersion.id}).`,
    );

    await this.ensureAssignment(
      parish.id,
      academicYear.id,
      catechismLevel.id,
      publishedVersion.id,
      adminUser.id,
      summary,
    );

    return summary;
  }

  private async findDemoParish(): Promise<Awaited<ReturnType<ParishService['getParishById']>>> {
    const parishList = await this.parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const parish = parishList.items.find(
      (item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    );

    if (parish === undefined) {
      throw new CurriculumDemoSeedPrerequisiteError(
        `Demo parish "${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.parishService.getParishById(parish.id);
  }

  private async findActiveDemoAcademicYear(
    parishId: string,
  ): Promise<Awaited<ReturnType<AcademicYearService['getAcademicYearById']>>> {
    const yearList = await this.academicYearService.listAcademicYearsByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'name',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
    });
    const activeYear = yearList.items.find(
      (item) =>
        item.name === PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME &&
        item.status === AcademicYearStatus.Active,
    );

    if (activeYear === undefined) {
      throw new CurriculumDemoSeedPrerequisiteError(
        `Active demo academic year "${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.academicYearService.getAcademicYearById(activeYear.id);
  }

  private async findDemoCatechismLevel(
    parishId: string,
  ): Promise<Awaited<ReturnType<CatechismLevelService['getCatechismLevelById']>>> {
    const levelList = await this.catechismLevelService.listCatechismLevelsByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'sortOrder',
      sort: 'ASC',
      search: CURRICULUM_DEMO_LEVEL_CODE,
    });
    const level = levelList.items.find((item) => item.code === CURRICULUM_DEMO_LEVEL_CODE);

    if (level === undefined) {
      throw new CurriculumDemoSeedPrerequisiteError(
        `Demo catechism level "${CURRICULUM_DEMO_LEVEL_CODE}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.catechismLevelService.getCatechismLevelById(level.id);
  }

  private async requireSeedUser(
    email: string,
    prerequisiteCommand: string,
  ): Promise<Awaited<ReturnType<UserAccountService['getAccountSnapshotById']>> & { id: string }> {
    const account = await this.userAccountService.findAccountSnapshotByEmail(email);

    if (account === null) {
      throw new CurriculumDemoSeedPrerequisiteError(
        `Sample user "${email}" not found. Run ${prerequisiteCommand} first.`,
      );
    }

    return account;
  }

  private async ensureCurriculum(
    parishId: string,
    catechismLevelId: string,
    summary: CurriculumDemoSeedSummary,
  ): Promise<CurriculumSnapshot> {
    const existingCurriculum = await this.findCurriculumByCode(parishId);

    if (existingCurriculum !== null) {
      summary.curriculumExisting = true;
      this.logger.log(`Demo curriculum ${CURRICULUM_DEMO_CURRICULUM_CODE} already exists.`);

      return existingCurriculum;
    }

    try {
      const createdCurriculum = await this.curriculumService.createCurriculum(parishId, {
        catechismLevelId,
        code: CURRICULUM_DEMO_CURRICULUM_CODE,
        name: CURRICULUM_DEMO_CURRICULUM_NAME,
        description: CURRICULUM_DEMO_CURRICULUM_DESCRIPTION,
        sourceLocale: CURRICULUM_DEMO_SOURCE_LOCALE,
      });
      summary.curriculumCreated = true;
      this.logger.log(`Created demo curriculum ${CURRICULUM_DEMO_CURRICULUM_CODE}.`);

      return createdCurriculum;
    } catch (error: unknown) {
      if (!(error instanceof CurriculumCodeAlreadyExistsError)) {
        throw error;
      }

      summary.curriculumExisting = true;
      this.logger.log(`Demo curriculum ${CURRICULUM_DEMO_CURRICULUM_CODE} already exists.`);

      const curriculum = await this.findCurriculumByCode(parishId);

      if (curriculum === null) {
        throw error;
      }

      return curriculum;
    }
  }

  private async findCurriculumByCode(parishId: string): Promise<CurriculumSnapshot | null> {
    const listResult = await this.curriculumService.listCurriculaByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
      search: CURRICULUM_DEMO_CURRICULUM_CODE,
    });

    const exactMatch = listResult.items.find(
      (snapshot) => snapshot.code === CURRICULUM_DEMO_CURRICULUM_CODE,
    );

    return exactMatch ?? null;
  }

  private async ensureDraftVersion(
    curriculumId: string,
    adminUserId: string,
    summary: CurriculumDemoSeedSummary,
  ): Promise<CurriculumVersionSnapshot> {
    const existingDraft = await this.findDraftVersion(curriculumId);

    if (existingDraft !== null) {
      summary.draftVersionExisting = true;
      this.logger.log(`Draft version already exists for demo curriculum (${existingDraft.id}).`);

      return existingDraft;
    }

    try {
      const createdDraft = await this.curriculumService.createDraftVersion(curriculumId, {
        label: CURRICULUM_DEMO_VERSION_LABEL,
        createdByUserId: adminUserId,
      });
      summary.draftVersionCreated = true;
      this.logger.log(`Created draft version for demo curriculum (${createdDraft.id}).`);

      return createdDraft;
    } catch (error: unknown) {
      if (!(error instanceof CurriculumDraftAlreadyExistsError)) {
        throw error;
      }

      summary.draftVersionExisting = true;
      this.logger.log('Draft version already exists for demo curriculum.');

      const draftVersion = await this.findDraftVersion(curriculumId);

      if (draftVersion === null) {
        throw error;
      }

      return draftVersion;
    }
  }

  private async findDraftVersion(curriculumId: string): Promise<CurriculumVersionSnapshot | null> {
    const versions = await this.curriculumService.listVersionsByCurriculum(curriculumId, {
      status: CurriculumVersionStatus.Draft,
    });

    return versions[0] ?? null;
  }

  private async ensureStructure(
    versionId: string,
    summary: CurriculumDemoSeedSummary,
  ): Promise<void> {
    const existingTopics = await this.topicService.listTopicsByVersion(versionId);

    for (const [topicIndex, topicDefinition] of CURRICULUM_DEMO_TOPICS.entries()) {
      const topic = await this.ensureTopic(
        versionId,
        topicDefinition,
        topicIndex + 1,
        existingTopics,
        summary,
      );
      const existingLessons = await this.lessonService.listLessonsByTopic(topic.id);

      for (const [lessonIndex, lessonDefinition] of topicDefinition.lessons.entries()) {
        const lesson = await this.ensureLesson(
          topic.id,
          lessonDefinition,
          lessonIndex + 1,
          existingLessons,
          summary,
        );

        await this.learningContentService.upsertLessonContent(lesson.id, {
          document: buildCurriculumDemoContentDocument(lessonDefinition.title),
        });
        summary.lessonContentsUpserted += 1;
      }
    }
  }

  private async ensureTopic(
    versionId: string,
    topicDefinition: CurriculumDemoSeedTopicDefinition,
    sortOrder: number,
    existingTopics: TopicSnapshot[],
    summary: CurriculumDemoSeedSummary,
  ): Promise<TopicSnapshot> {
    const existingTopic = existingTopics.find((topic) => topic.code === topicDefinition.code);

    if (existingTopic !== undefined) {
      summary.topicsExisting += 1;
      this.logger.log(`Demo topic ${topicDefinition.code} already exists.`);

      return existingTopic;
    }

    try {
      const createdTopic = await this.topicService.createTopic(versionId, {
        code: topicDefinition.code,
        title: topicDefinition.title,
        description: topicDefinition.description,
        sortOrder,
      });
      summary.topicsCreated += 1;
      this.logger.log(`Created demo topic ${topicDefinition.code}.`);

      return createdTopic;
    } catch (error: unknown) {
      if (!(error instanceof TopicCodeAlreadyExistsError)) {
        throw error;
      }

      summary.topicsExisting += 1;
      this.logger.log(`Demo topic ${topicDefinition.code} already exists.`);

      const refreshedTopics = await this.topicService.listTopicsByVersion(versionId);
      const topic = refreshedTopics.find((item) => item.code === topicDefinition.code);

      if (topic === undefined) {
        throw error;
      }

      return topic;
    }
  }

  private async ensureLesson(
    topicId: string,
    lessonDefinition: CurriculumDemoSeedLessonDefinition,
    sortOrder: number,
    existingLessons: LessonSnapshot[],
    summary: CurriculumDemoSeedSummary,
  ): Promise<LessonSnapshot> {
    const existingLesson = existingLessons.find((lesson) => lesson.code === lessonDefinition.code);

    if (existingLesson !== undefined) {
      summary.lessonsExisting += 1;
      this.logger.log(`Demo lesson ${lessonDefinition.code} already exists.`);

      return existingLesson;
    }

    try {
      const createdLesson = await this.lessonService.createLesson(topicId, {
        code: lessonDefinition.code,
        title: lessonDefinition.title,
        summary: lessonDefinition.summary,
        sortOrder,
      });
      summary.lessonsCreated += 1;
      this.logger.log(`Created demo lesson ${lessonDefinition.code}.`);

      return createdLesson;
    } catch (error: unknown) {
      if (!(error instanceof LessonCodeAlreadyExistsError)) {
        throw error;
      }

      summary.lessonsExisting += 1;
      this.logger.log(`Demo lesson ${lessonDefinition.code} already exists.`);

      const refreshedLessons = await this.lessonService.listLessonsByTopic(topicId);
      const lesson = refreshedLessons.find((item) => item.code === lessonDefinition.code);

      if (lesson === undefined) {
        throw error;
      }

      return lesson;
    }
  }

  private async ensureAssignment(
    parishId: string,
    academicYearId: string,
    catechismLevelId: string,
    curriculumVersionId: string,
    adminUserId: string,
    summary: CurriculumDemoSeedSummary,
  ): Promise<CurriculumAssignmentSnapshot> {
    let existingAssignment: CurriculumAssignmentSnapshot | null = null;

    try {
      existingAssignment = await this.curriculumService.getCurriculumAssignment(
        parishId,
        academicYearId,
        catechismLevelId,
      );
    } catch {
      existingAssignment = null;
    }

    const assignment = await this.curriculumService.upsertCurriculumAssignment(
      parishId,
      academicYearId,
      catechismLevelId,
      {
        curriculumVersionId,
        assignedByUserId: adminUserId,
      },
    );

    if (
      existingAssignment !== null &&
      existingAssignment.curriculumVersionId === curriculumVersionId
    ) {
      summary.assignmentExisting = true;
      this.logger.log('Demo curriculum assignment already present.');
    } else if (existingAssignment === null) {
      summary.assignmentCreated = true;
      this.logger.log('Created demo curriculum assignment.');
    } else {
      summary.assignmentCreated = true;
      this.logger.log('Updated demo curriculum assignment.');
    }

    return assignment;
  }
}
