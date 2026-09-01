import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4, normalizeUuid } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { AcademicYearStatus } from '../../src/modules/academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { ClassModule } from '../../src/modules/class/class.module';
import { CatechistAssignmentRole } from '../../src/modules/class/enums/catechist-assignment-role.enum';
import { ClassStatus } from '../../src/modules/class/enums/class-status.enum';
import { ClassCatechistAssignmentService } from '../../src/modules/class/services/class-catechist-assignment.service';
import { ClassScopeService } from '../../src/modules/class/services/class-scope.service';
import { ClassService } from '../../src/modules/class/services/class.service';
import { CurriculumOrchestrationModule } from '../../src/modules/curriculum-orchestration/curriculum-orchestration.module';
import { CurriculumVersionOrchestrationService } from '../../src/modules/curriculum-orchestration/services/curriculum-version-orchestration.service';
import { CurriculumModule } from '../../src/modules/curriculum/curriculum.module';
import { CurriculumVersionStatus } from '../../src/modules/curriculum/enums/curriculum-version-status.enum';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { LessonService } from '../../src/modules/curriculum/services/lesson.service';
import { TopicService } from '../../src/modules/curriculum/services/topic.service';
import { CurriculumDeliveryModule } from '../../src/modules/curriculum-delivery/curriculum-delivery.module';
import { DraftCurriculumDeliveryDeniedError } from '../../src/modules/curriculum-delivery/errors/curriculum-delivery.errors';
import { CurriculumDeliveryService } from '../../src/modules/curriculum-delivery/services/curriculum-delivery.service';
import { ClassDomainScopeModule } from '../../src/modules/enrollment/class-domain-scope.module';
import { EnrollmentModule } from '../../src/modules/enrollment/enrollment.module';
import {
  CONTENT_DOCUMENT_SCHEMA_VERSION,
  type ContentDocumentV1,
} from '../../src/modules/learning-content/interfaces/learning-content.interface';
import { LearningContentModule } from '../../src/modules/learning-content/learning-content.module';
import { LearningContentService } from '../../src/modules/learning-content/services/learning-content.service';
import { ParishMembershipStatus } from '../../src/modules/parish/enums/parish-membership-status.enum';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { StudentModule } from '../../src/modules/student/student.module';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';

const TEST_CODE_PREFIX = 'cur005-int-';
const DUMMY_PASSWORD = 'SecurePassword123!';

const sampleDocument: ContentDocumentV1 = {
  schemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
  blocks: [
    { type: 'heading', level: 1, text: 'Giáo lý Khai Tâm' },
    { type: 'paragraph', text: 'Nội dung bài học mẫu.' },
  ],
};

describe('Curriculum delivery integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let academicYearService: AcademicYearService;
  let catechismLevelService: CatechismLevelService;
  let classService: ClassService;
  let classScopeService: ClassScopeService;
  let classCatechistAssignmentService: ClassCatechistAssignmentService;
  let curriculumService: CurriculumService;
  let topicService: TopicService;
  let lessonService: LessonService;
  let learningContentService: LearningContentService;
  let curriculumVersionOrchestrationService: CurriculumVersionOrchestrationService;
  let curriculumDeliveryService: CurriculumDeliveryService;
  let userAccountService: UserAccountService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ApplicationConfigModule,
        DatabaseModule,
        UsersModule,
        ParishModule,
        AcademicStructureModule,
        ClassModule,
        StudentModule,
        EnrollmentModule,
        ClassDomainScopeModule,
        CurriculumModule,
        LearningContentModule,
        CurriculumOrchestrationModule,
        CurriculumDeliveryModule,
      ],
    }).compile();

    parishService = moduleRef.get(ParishService);
    academicYearService = moduleRef.get(AcademicYearService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
    classService = moduleRef.get(ClassService);
    classScopeService = moduleRef.get(ClassScopeService);
    classCatechistAssignmentService = moduleRef.get(ClassCatechistAssignmentService);
    curriculumService = moduleRef.get(CurriculumService);
    topicService = moduleRef.get(TopicService);
    lessonService = moduleRef.get(LessonService);
    learningContentService = moduleRef.get(LearningContentService);
    curriculumVersionOrchestrationService = moduleRef.get(CurriculumVersionOrchestrationService);
    curriculumDeliveryService = moduleRef.get(CurriculumDeliveryService);
    userAccountService = moduleRef.get(UserAccountService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM curriculum_assignments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM lesson_contents
      WHERE lesson_id IN (
        SELECT l.id FROM lessons l
        INNER JOIN topics t ON t.id = l.topic_id
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM lessons
      WHERE topic_id IN (
        SELECT t.id FROM topics t
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM topics
      WHERE curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      UPDATE curriculums
      SET current_published_version_id = NULL
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM curriculum_versions
      WHERE curriculum_id IN (SELECT id FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE class_id IN (SELECT id FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM academic_years WHERE name LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM catechism_levels WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  async function seedAdminUser(): Promise<string> {
    const account = await userAccountService.createAccount({
      email: `${TEST_CODE_PREFIX}admin@example.com`,
      password: DUMMY_PASSWORD,
    });

    return account.id;
  }

  async function ensureParishMembership(userId: string, parishId: string): Promise<void> {
    await AppDataSource.query(
      `
        INSERT INTO parish_memberships (
          id, parish_id, user_id, status, joined_at, ended_at, created_at, updated_at
        )
        VALUES (@0, @1, @2, @3, GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE())
      `,
      [generateUuidV4(), parishId, userId, ParishMembershipStatus.Active],
    );
  }

  async function seedPublishedAssignedClassFixture(): Promise<{
    adminUserId: string;
    classId: string;
    lessonId: string;
    canonicalLessonKey: string;
    publishedVersionId: string;
  }> {
    const adminUserId = await seedAdminUser();
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Curriculum Delivery Parish',
    });
    await ensureParishMembership(adminUserId, parish.id);

    const academicYear = await academicYearService.createAcademicYear(parish.id, {
      name: `${TEST_CODE_PREFIX}year`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });
    const activeYear = await academicYearService.updateAcademicYearStatus(
      academicYear.id,
      AcademicYearStatus.Active,
    );
    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}level`,
      name: 'Level One',
      sortOrder: 1,
    });
    const createdClass = await classService.createClass(parish.id, {
      academicYearId: activeYear.id,
      catechismLevelId: catechismLevel.id,
      code: `${TEST_CODE_PREFIX}class`,
      name: 'Delivery Class',
    });
    const activeClass = await classService.updateClassStatus(createdClass.id, ClassStatus.Active);

    const curriculum = await curriculumService.createCurriculum(parish.id, {
      catechismLevelId: catechismLevel.id,
      code: `${TEST_CODE_PREFIX}curriculum`,
      name: 'Delivery Curriculum',
      sourceLocale: 'vi-VN',
    });
    const draftVersion = await curriculumService.createDraftVersion(curriculum.id, {
      createdByUserId: adminUserId,
    });
    const topic = await topicService.createTopic(draftVersion.id, {
      title: 'Chủ đề A',
      sortOrder: 0,
    });
    const lesson = await lessonService.createLesson(topic.id, {
      title: 'Bài học A',
      sortOrder: 0,
      estimatedDurationMinutes: 45,
    });

    await learningContentService.upsertLessonContent(lesson.id, { document: sampleDocument });

    const published = await curriculumVersionOrchestrationService.publishVersion(
      draftVersion.id,
      adminUserId,
    );

    await curriculumService.upsertCurriculumAssignment(
      parish.id,
      activeYear.id,
      catechismLevel.id,
      {
        curriculumVersionId: published.id,
        assignedByUserId: adminUserId,
      },
    );

    return {
      adminUserId,
      classId: activeClass.id,
      lessonId: lesson.id,
      canonicalLessonKey: lesson.canonicalLessonKey,
      publishedVersionId: published.id,
    };
  }

  it('delivers the published assigned curriculum tree for a class', async () => {
    const { adminUserId, classId, lessonId, canonicalLessonKey, publishedVersionId } =
      await seedPublishedAssignedClassFixture();

    const tree = await curriculumDeliveryService.getClassCurriculumTree(adminUserId, classId, null);

    expect(tree.curriculum.name).toBe('Delivery Curriculum');
    expect(normalizeUuid(tree.version.id)).toBe(normalizeUuid(publishedVersionId));
    expect(tree.topics).toHaveLength(1);
    expect(tree.topics[0]?.lessons).toHaveLength(1);
    expect(normalizeUuid(tree.topics[0]?.lessons[0]?.id ?? '')).toBe(normalizeUuid(lessonId));
    expect(normalizeUuid(tree.topics[0]?.lessons[0]?.canonicalLessonKey ?? '')).toBe(
      normalizeUuid(canonicalLessonKey),
    );
  });

  it('denies draft lesson content via the contextual class route', async () => {
    const { adminUserId, classId, publishedVersionId } = await seedPublishedAssignedClassFixture();

    const clonedDraft = await curriculumVersionOrchestrationService.cloneVersionToDraft(
      publishedVersionId,
      adminUserId,
    );
    const clonedTree = await curriculumService.getVersionTree(clonedDraft.id);
    const draftLessonId = clonedTree.topics[0]?.lessons[0]?.id ?? '';

    await expect(
      curriculumDeliveryService.getClassLessonContent(adminUserId, classId, draftLessonId, null),
    ).rejects.toBeInstanceOf(DraftCurriculumDeliveryDeniedError);
  });

  it('preserves canonicalLessonKey in the learner curriculum tree after clone', async () => {
    const { adminUserId, classId, canonicalLessonKey, publishedVersionId } =
      await seedPublishedAssignedClassFixture();

    const clonedDraft = await curriculumVersionOrchestrationService.cloneVersionToDraft(
      publishedVersionId,
      adminUserId,
    );

    expect(clonedDraft.status).toBe(CurriculumVersionStatus.Draft);

    const clonedTree = await curriculumService.getVersionTree(clonedDraft.id);
    expect(normalizeUuid(clonedTree.topics[0]?.lessons[0]?.canonicalLessonKey ?? '')).toBe(
      normalizeUuid(canonicalLessonKey),
    );

    const learnerTree = await curriculumDeliveryService.getClassCurriculumTree(
      adminUserId,
      classId,
      null,
    );

    expect(normalizeUuid(learnerTree.topics[0]?.lessons[0]?.canonicalLessonKey ?? '')).toBe(
      normalizeUuid(canonicalLessonKey),
    );
    expect(normalizeUuid(learnerTree.version.id)).toBe(normalizeUuid(publishedVersionId));
  });

  it('allows assigned catechists to read class curriculum via scope checks', async () => {
    const { classId } = await seedPublishedAssignedClassFixture();
    const catechistAccount = await userAccountService.createAccount({
      email: `${TEST_CODE_PREFIX}catechist@example.com`,
      password: DUMMY_PASSWORD,
    });

    await classCatechistAssignmentService.assignCatechist(classId, {
      catechistUserId: catechistAccount.id,
      assignmentRole: CatechistAssignmentRole.Lead,
    });

    await expect(
      classScopeService.assertCanReadClass(catechistAccount.id, classId),
    ).resolves.toBeUndefined();

    const tree = await curriculumDeliveryService.getClassCurriculumTree(
      catechistAccount.id,
      classId,
      null,
    );

    expect(tree.topics).toHaveLength(1);
  });
});
