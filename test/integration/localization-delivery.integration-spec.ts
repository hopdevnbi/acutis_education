import { Test, type TestingModule } from '@nestjs/testing';
import { deleteClassOperationsRowsForParishCodePrefix } from './helpers/delete-class-operations-rows-for-parish-code.util';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4, normalizeUuid } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import { CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME } from '../../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../../src/database/seeds/curriculum-demo.seed.service';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../../src/database/seeds/parish-academic.seed.constants';
import {
  AUTH_RBAC_SEED_USERS,
  AUTH_RBAC_SAMPLE_DOMAIN,
} from '../../src/database/seeds/auth-rbac.seed.constants';
import { QUESTION_BANK_DEMO_QUESTIONS } from '../../src/database/seeds/question-bank-demo.seed.constants';
import { QuestionBankDemoSeedModule } from '../../src/database/seeds/question-bank-demo-seed.module';
import { QuestionBankDemoSeedService } from '../../src/database/seeds/question-bank-demo.seed.service';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { AcademicYearStatus } from '../../src/modules/academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { ClassModule } from '../../src/modules/class/class.module';
import { ClassStatus } from '../../src/modules/class/enums/class-status.enum';
import { ClassService } from '../../src/modules/class/services/class.service';
import { CurriculumOrchestrationModule } from '../../src/modules/curriculum-orchestration/curriculum-orchestration.module';
import { CurriculumVersionOrchestrationService } from '../../src/modules/curriculum-orchestration/services/curriculum-version-orchestration.service';
import { CurriculumModule } from '../../src/modules/curriculum/curriculum.module';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { LessonService } from '../../src/modules/curriculum/services/lesson.service';
import { TopicService } from '../../src/modules/curriculum/services/topic.service';
import { CurriculumDeliveryModule } from '../../src/modules/curriculum-delivery/curriculum-delivery.module';
import { CurriculumDeliveryService } from '../../src/modules/curriculum-delivery/services/curriculum-delivery.service';
import { ClassDomainScopeModule } from '../../src/modules/enrollment/class-domain-scope.module';
import { EnrollmentModule } from '../../src/modules/enrollment/enrollment.module';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import {
  CONTENT_DOCUMENT_SCHEMA_VERSION,
  type ContentDocumentV1,
} from '../../src/modules/learning-content/interfaces/learning-content.interface';
import { LearningContentModule } from '../../src/modules/learning-content/learning-content.module';
import { LearningContentService } from '../../src/modules/learning-content/services/learning-content.service';
import { TranslationResourceType } from '../../src/modules/localization/enums/translation-resource-type.enum';
import { TranslationRevisionStatus } from '../../src/modules/localization/enums/translation-revision-status.enum';
import { LocalizationModule } from '../../src/modules/localization/localization.module';
import { LocalizationService } from '../../src/modules/localization/services/localization.service';
import {
  computeCurriculumLessonContentHash,
  computeCurriculumMetadataContentHash,
  computeCurriculumTopicContentHash,
  computeCurriculumVersionContentHash,
} from '../../src/modules/localization/utils/curriculum-translation-hash.util';
import { ParishMembershipStatus } from '../../src/modules/parish/enums/parish-membership-status.enum';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { PracticeModule } from '../../src/modules/practice/practice.module';
import { PracticeSessionStatus } from '../../src/modules/practice/enums/practice-session-status.enum';
import { PracticeService } from '../../src/modules/practice/services/practice.service';
import { QuestionType } from '../../src/modules/question-bank/enums/question-type.enum';
import { QuestionBankModule } from '../../src/modules/question-bank/question-bank.module';
import { QuestionBankService } from '../../src/modules/question-bank/services/question-bank.service';
import { StudentModule } from '../../src/modules/student/student.module';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';
import {
  applyQuestionBankTranslation,
  buildQuestionBankTranslationPayload,
} from '../../src/modules/localization/utils/question-bank-translation.util';

const TEST_CODE_PREFIX = 'loc005-del-';
const DUMMY_PASSWORD = 'SecurePassword123!';
const TARGET_LOCALE = 'en-US';

const sampleDocument: ContentDocumentV1 = {
  schemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
  blocks: [
    { type: 'heading', level: 1, text: 'Giáo lý Khai Tâm' },
    { type: 'paragraph', text: 'Nội dung bài học mẫu.' },
  ],
};

describe('Localization delivery integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let academicYearService: AcademicYearService;
  let catechismLevelService: CatechismLevelService;
  let classService: ClassService;
  let curriculumService: CurriculumService;
  let topicService: TopicService;
  let lessonService: LessonService;
  let learningContentService: LearningContentService;
  let curriculumVersionOrchestrationService: CurriculumVersionOrchestrationService;
  let curriculumDeliveryService: CurriculumDeliveryService;
  let localizationService: LocalizationService;
  let userAccountService: UserAccountService;
  let practiceService: PracticeService;
  let questionBankService: QuestionBankService;
  let enrollmentService: EnrollmentService;
  let studentService: StudentService;
  let parentUserId: string;
  let demoEnrollmentId: string;
  let demoParishId: string;

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
        AuthRbacSeedModule,
        ParishAcademicSeedModule,
        ClassEnrollmentSeedModule,
        CurriculumDemoSeedModule,
        QuestionBankDemoSeedModule,
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
        LocalizationModule,
        QuestionBankModule,
        PracticeModule,
      ],
    }).compile();

    const authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    const curriculumDemoSeedService = moduleRef.get(CurriculumDemoSeedService);
    const questionBankDemoSeedService = moduleRef.get(QuestionBankDemoSeedService);

    parishService = moduleRef.get(ParishService);
    academicYearService = moduleRef.get(AcademicYearService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
    classService = moduleRef.get(ClassService);
    curriculumService = moduleRef.get(CurriculumService);
    topicService = moduleRef.get(TopicService);
    lessonService = moduleRef.get(LessonService);
    learningContentService = moduleRef.get(LearningContentService);
    curriculumVersionOrchestrationService = moduleRef.get(CurriculumVersionOrchestrationService);
    curriculumDeliveryService = moduleRef.get(CurriculumDeliveryService);
    localizationService = moduleRef.get(LocalizationService);
    userAccountService = moduleRef.get(UserAccountService);
    practiceService = moduleRef.get(PracticeService);
    questionBankService = moduleRef.get(QuestionBankService);
    enrollmentService = moduleRef.get(EnrollmentService);
    studentService = moduleRef.get(StudentService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();
    await questionBankDemoSeedService.run();

    const parishList = await parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const demoParish = parishList.items.find(
      (item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    );

    if (demoParish === undefined) {
      throw new Error('Expected demo parish after prerequisite seeds.');
    }

    demoParishId = demoParish.id;

    const parentEmail =
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARENT')?.email ??
      `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`;
    const parentAccount = await userAccountService.findAccountSnapshotByEmail(parentEmail);

    if (parentAccount === null) {
      throw new Error(`Expected seeded parent account for ${parentEmail}.`);
    }

    parentUserId = parentAccount.id;

    const alphaStudent = (
      await studentService.listStudents({
        page: 1,
        limit: 5,
        sortBy: 'fullName',
        sort: 'ASC',
        search: CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
      })
    ).items.find((item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);

    if (alphaStudent === undefined) {
      throw new Error('Expected demo student alpha to exist.');
    }

    const enrollments = await enrollmentService.listEnrollmentsByStudent(alphaStudent.id, {
      page: 1,
      limit: 5,
      sortBy: 'enrolledAt',
      sort: 'DESC',
    });
    const activeEnrollment = enrollments.items[0];

    if (activeEnrollment === undefined) {
      throw new Error('Expected active enrollment for demo student alpha.');
    }

    demoEnrollmentId = activeEnrollment.id;
  });

  afterEach(async () => {
    await AppDataSource.query(
      `
      DELETE FROM practice_sessions
      WHERE enrollment_id = @0
    `,
      [demoEnrollmentId],
    );

    await deleteClassOperationsRowsForParishCodePrefix(AppDataSource, TEST_CODE_PREFIX);

    await AppDataSource.query(`
      DELETE FROM translation_revisions
      WHERE translation_resource_id IN (
        SELECT id FROM translation_resources
        WHERE resource_id IN (SELECT id FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%')
           OR resource_id IN (
             SELECT l.id FROM lessons l
             INNER JOIN topics t ON t.id = l.topic_id
             INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
             INNER JOIN curriculums c ON c.id = cv.curriculum_id
             WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
           )
           OR resource_id IN (
             SELECT cv.id FROM curriculum_versions cv
             INNER JOIN curriculums c ON c.id = cv.curriculum_id
             WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
           )
           OR resource_id IN (
             SELECT t.id FROM topics t
             INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
             INNER JOIN curriculums c ON c.id = cv.curriculum_id
             WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
           )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM translation_resources
      WHERE resource_id IN (SELECT id FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%')
         OR resource_id IN (
           SELECT l.id FROM lessons l
           INNER JOIN topics t ON t.id = l.topic_id
           INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
           INNER JOIN curriculums c ON c.id = cv.curriculum_id
           WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
         )
         OR resource_id IN (
           SELECT cv.id FROM curriculum_versions cv
           INNER JOIN curriculums c ON c.id = cv.curriculum_id
           WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
         )
         OR resource_id IN (
           SELECT t.id FROM topics t
           INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
           INNER JOIN curriculums c ON c.id = cv.curriculum_id
           WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
         )
    `);

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
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
         OR user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%')
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

    await AppDataSource.query(
      `
      DELETE FROM translation_revisions
      WHERE translation_resource_id IN (
        SELECT id FROM translation_resources
        WHERE resource_type = 'QUESTION_BANK_VERSION'
          AND parish_id = @0
      )
    `,
      [demoParishId],
    );

    await AppDataSource.query(
      `
      DELETE FROM translation_jobs
      WHERE translation_resource_id IN (
        SELECT id FROM translation_resources
        WHERE resource_type = 'QUESTION_BANK_VERSION'
          AND parish_id = @0
      )
    `,
      [demoParishId],
    );

    await AppDataSource.query(
      `
      DELETE FROM translation_resources
      WHERE resource_type = 'QUESTION_BANK_VERSION'
        AND parish_id = @0
    `,
      [demoParishId],
    );

    await AppDataSource.query(`
      DELETE FROM translation_revisions
      WHERE approved_by_user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%')
         OR created_by_user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%')
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
      email: `${TEST_CODE_PREFIX}admin-${generateUuidV4()}@example.com`,
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
    parishId: string;
    classId: string;
    curriculumId: string;
    topicId: string;
    lessonId: string;
    canonicalLessonKey: string;
    publishedVersionId: string;
  }> {
    const adminUserId = await seedAdminUser();
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Localization Delivery Parish',
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
      parishId: parish.id,
      classId: activeClass.id,
      curriculumId: curriculum.id,
      topicId: topic.id,
      lessonId: lesson.id,
      canonicalLessonKey: lesson.canonicalLessonKey,
      publishedVersionId: published.id,
    };
  }

  async function seedApprovedCurriculumTranslations(input: {
    readonly parishId: string;
    readonly adminUserId: string;
    readonly curriculumId: string;
    readonly publishedVersionId: string;
    readonly topicId: string;
    readonly lessonId: string;
    readonly canonicalLessonKey: string;
  }): Promise<void> {
    const curriculum = await curriculumService.getCurriculumById(input.curriculumId);
    const version = await curriculumService.getVersionById(input.publishedVersionId);
    const topic = await topicService.getTopicById(input.topicId);
    const lesson = await lessonService.getLessonById(input.lessonId);

    const metadataHash = computeCurriculumMetadataContentHash({
      name: curriculum.name,
      description: curriculum.description,
    });
    const versionHash = computeCurriculumVersionContentHash({ label: version.label });
    const topicHash = computeCurriculumTopicContentHash({
      title: topic.title,
      description: topic.description,
    });
    const lessonHash = computeCurriculumLessonContentHash({
      title: lesson.title,
      summary: lesson.summary,
    });

    const bindings = [
      {
        resourceType: TranslationResourceType.CurriculumMetadata,
        resourceId: curriculum.id,
        sourceContentHash: metadataHash,
        payload: { name: 'English Curriculum', description: null },
      },
      {
        resourceType: TranslationResourceType.CurriculumVersion,
        resourceId: version.id,
        sourceContentHash: versionHash,
        payload: { label: 'English Version' },
      },
      {
        resourceType: TranslationResourceType.CurriculumTopic,
        resourceId: topic.id,
        sourceContentHash: topicHash,
        payload: { title: 'English Topic', description: null },
      },
      {
        resourceType: TranslationResourceType.CurriculumLesson,
        resourceId: lesson.id,
        sourceContentHash: lessonHash,
        payload: { title: 'English Lesson', summary: 'English summary' },
      },
    ] as const;

    for (const binding of bindings) {
      const resource = await localizationService.getOrCreateTranslationResource({
        resourceType: binding.resourceType,
        resourceId: binding.resourceId,
        parishId: input.parishId,
        sourceLocale: curriculum.sourceLocale,
      });

      await localizationService.createTranslationRevision({
        translationResourceId: resource.id,
        targetLocale: TARGET_LOCALE,
        sourceContentHash: binding.sourceContentHash,
        status: TranslationRevisionStatus.Approved,
        payload: binding.payload,
        approvedByUserId: input.adminUserId,
        approvedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    }
  }

  it('delivers APPROVED en-US curriculum tree with translated fields and stable structure', async () => {
    const fixture = await seedPublishedAssignedClassFixture();

    await seedApprovedCurriculumTranslations(fixture);
    await userAccountService.updatePreferredLocale(fixture.adminUserId, TARGET_LOCALE);

    const tree = await curriculumDeliveryService.getClassCurriculumTree(
      fixture.adminUserId,
      fixture.classId,
      null,
    );

    expect(tree.resolvedLocale).toBe(TARGET_LOCALE);
    expect(tree.translationStatus).toBe('APPROVED');
    expect(tree.isFallback).toBe(false);
    expect(tree.curriculum.name).toBe('English Curriculum');
    expect(tree.version.label).toBe('English Version');
    expect(tree.topics[0]?.title).toBe('English Topic');
    expect(tree.topics[0]?.lessons[0]?.title).toBe('English Lesson');
    expect(normalizeUuid(tree.topics[0]?.lessons[0]?.id ?? '')).toBe(
      normalizeUuid(fixture.lessonId),
    );
    expect(normalizeUuid(tree.topics[0]?.lessons[0]?.canonicalLessonKey ?? '')).toBe(
      normalizeUuid(fixture.canonicalLessonKey),
    );
  });

  it('creates and replays APPROVED en-US practice sessions with pinned translation revisions', async () => {
    const demoQuestionCode = QUESTION_BANK_DEMO_QUESTIONS[0]?.code ?? 'qb-demo-single-001';
    const questions = await questionBankService.listQuestionsByParish(demoParishId, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
      code: demoQuestionCode,
    });
    const question = questions.items[0];

    if (question === undefined || question.currentPublishedVersionId === null) {
      throw new Error('Expected published demo question.');
    }

    const assessment = await questionBankService.getImmutableAssessmentSnapshot(
      question.currentPublishedVersionId,
    );

    if (assessment.sourceContentHash === null) {
      throw new Error('Expected question source content hash.');
    }

    const translatedPayload = buildQuestionBankTranslationPayload(assessment, [
      { id: 'question.prompt', text: 'Who created the universe according to Catholic faith?' },
      { id: 'question.instruction', text: 'Choose the best answer.' },
      {
        id: `option:${normalizeUuid(assessment.options[0]?.id ?? '')}:text`,
        text: 'God',
      },
      {
        id: `option:${normalizeUuid(assessment.options[1]?.id ?? '')}:text`,
        text: 'Humankind',
      },
      {
        id: `option:${normalizeUuid(assessment.options[2]?.id ?? '')}:text`,
        text: 'Nature evolved alone',
      },
    ]);
    const display = applyQuestionBankTranslation(
      assessment,
      translatedPayload,
      'God is the Creator (English explanation).',
    );

    const resource = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.QuestionBankVersion,
      resourceId: question.currentPublishedVersionId,
      parishId: demoParishId,
      sourceLocale: assessment.sourceLocale,
    });

    const firstRevision = await localizationService.createTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: TARGET_LOCALE,
      sourceContentHash: assessment.sourceContentHash,
      status: TranslationRevisionStatus.Approved,
      payload: { ...translatedPayload, display },
      approvedByUserId: parentUserId,
      approvedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const created = await practiceService.createSession({
      enrollmentId: demoEnrollmentId,
      actorUserId: parentUserId,
      locale: TARGET_LOCALE,
      questionCount: 1,
      questionTypes: [QuestionType.SingleChoice],
      randomizeQuestions: false,
      randomizeOptions: false,
    });

    const sessionQuestion = created.questions[0];

    if (sessionQuestion === undefined) {
      throw new Error('Expected one practice question.');
    }

    expect(sessionQuestion.deliveredLocale).toBe(TARGET_LOCALE);
    expect(normalizeUuid(sessionQuestion.translationRevisionId ?? '')).toBe(
      normalizeUuid(firstRevision.id),
    );
    expect(sessionQuestion.translationStatus).toBe('APPROVED');
    expect(sessionQuestion.isFallback).toBe(false);
    expect(sessionQuestion.prompt).toContain('Catholic faith');

    await localizationService.createTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: TARGET_LOCALE,
      sourceContentHash: assessment.sourceContentHash,
      status: TranslationRevisionStatus.Approved,
      payload: {
        ...translatedPayload,
        display: {
          ...display,
          prompt: 'Newer approved prompt that must not affect pinned session.',
        },
      },
      approvedByUserId: parentUserId,
      approvedAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    const replayed = await practiceService.getSession(parentUserId, created.id);
    const replayedQuestion = replayed.questions[0];

    if (replayedQuestion === undefined) {
      throw new Error('Expected replayed practice question.');
    }

    expect(normalizeUuid(replayedQuestion.translationRevisionId ?? '')).toBe(
      normalizeUuid(firstRevision.id),
    );
    expect(replayedQuestion.prompt).toBe(sessionQuestion.prompt);
    expect(replayedQuestion.prompt).not.toContain('Newer approved prompt');

    const wrongOptionId = replayedQuestion.options.find((option) => option.text !== 'God')?.id;

    if (wrongOptionId === undefined) {
      throw new Error('Expected a wrong option for practice attempt.');
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await practiceService.submitAnswer({
        actorUserId: parentUserId,
        sessionId: created.id,
        sessionQuestionId: replayedQuestion.sessionQuestionId,
        clientAnswerId: generateUuidV4(),
        selectedOptionIds: [wrongOptionId],
      });
    }

    const completed = await practiceService.getSession(parentUserId, created.id);
    expect(completed.status).toBe(PracticeSessionStatus.Completed);

    const review = await practiceService.createReviewWrongSession({
      sourceSessionId: created.id,
      actorUserId: parentUserId,
      clientRequestId: generateUuidV4(),
    });
    const reviewQuestion = review.snapshot.questions[0];

    if (reviewQuestion === undefined) {
      throw new Error('Expected review-wrong question.');
    }

    expect(normalizeUuid(reviewQuestion.translationRevisionId ?? '')).toBe(
      normalizeUuid(firstRevision.id),
    );
    expect(reviewQuestion.deliveredLocale).toBe(TARGET_LOCALE);
    expect(reviewQuestion.prompt).toBe(sessionQuestion.prompt);
  });
});
