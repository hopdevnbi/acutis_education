import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import { CurriculumDemoSeedModule } from '../../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../../src/database/seeds/curriculum-demo.seed.service';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import { CURRICULUM_DEMO_CURRICULUM_CODE } from '../../src/database/seeds/curriculum-demo.seed.constants';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../../src/database/seeds/parish-academic.seed.constants';
import { QuestionBankDemoSeedModule } from '../../src/database/seeds/question-bank-demo-seed.module';
import {
  QUESTION_BANK_DEMO_QUESTIONS,
  QUESTION_BANK_DEMO_TAGS,
} from '../../src/database/seeds/question-bank-demo.seed.constants';
import {
  QuestionBankDemoSeedPrerequisiteError,
  QuestionBankDemoSeedService,
} from '../../src/database/seeds/question-bank-demo.seed.service';
import { QuestionVersionStatus } from '../../src/modules/question-bank/enums/question-version-status.enum';
import { QuestionBankService } from '../../src/modules/question-bank/services/question-bank.service';
import { QuestionOptionService } from '../../src/modules/question-bank/services/question-option.service';
import { ParishService } from '../../src/modules/parish/services/parish.service';

describe('QuestionBankDemoSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let authRbacSeedService: AuthRbacSeedService;
  let parishAcademicSeedService: ParishAcademicSeedService;
  let classEnrollmentSeedService: ClassEnrollmentSeedService;
  let curriculumDemoSeedService: CurriculumDemoSeedService;
  let questionBankDemoSeedService: QuestionBankDemoSeedService;
  let parishService: ParishService;
  let questionBankService: QuestionBankService;
  let questionOptionService: QuestionOptionService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        AuthRbacSeedModule,
        ParishAcademicSeedModule,
        ClassEnrollmentSeedModule,
        CurriculumDemoSeedModule,
        QuestionBankDemoSeedModule,
      ],
    }).compile();

    authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    curriculumDemoSeedService = moduleRef.get(CurriculumDemoSeedService);
    questionBankDemoSeedService = moduleRef.get(QuestionBankDemoSeedService);
    parishService = moduleRef.get(ParishService);
    questionBankService = moduleRef.get(QuestionBankService);
    questionOptionService = moduleRef.get(QuestionOptionService);

    await authRbacSeedService.run();
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM question_correct_options
      WHERE question_version_id IN (
        SELECT qv.id FROM question_versions qv
        INNER JOIN questions q ON q.id = qv.question_id
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
          AND q.code LIKE 'qb-demo-%'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM question_options
      WHERE question_version_id IN (
        SELECT qv.id FROM question_versions qv
        INNER JOIN questions q ON q.id = qv.question_id
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
          AND q.code LIKE 'qb-demo-%'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM question_tag_links
      WHERE question_id IN (
        SELECT q.id FROM questions q
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
          AND q.code LIKE 'qb-demo-%'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM question_curriculum_links
      WHERE question_id IN (
        SELECT q.id FROM questions q
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
          AND q.code LIKE 'qb-demo-%'
      )
    `);
    await AppDataSource.query(`
      UPDATE questions
      SET current_published_version_id = NULL
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
        AND code LIKE 'qb-demo-%'
    `);
    await AppDataSource.query(`
      DELETE FROM question_versions
      WHERE question_id IN (
        SELECT q.id FROM questions q
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
          AND q.code LIKE 'qb-demo-%'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM questions
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
        AND code LIKE 'qb-demo-%'
    `);
    await AppDataSource.query(`
      DELETE FROM question_tags
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
        AND code LIKE 'demo-%'
    `);
    await AppDataSource.query(`
      DELETE FROM curriculum_assignments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      UPDATE curriculums
      SET current_published_version_id = NULL
      WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
    `);
    await AppDataSource.query(`
      DELETE FROM lesson_contents
      WHERE lesson_id IN (
        SELECT l.id FROM lessons l
        INNER JOIN topics t ON t.id = l.topic_id
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM lessons
      WHERE topic_id IN (
        SELECT t.id FROM topics t
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM topics
      WHERE curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM curriculum_versions
      WHERE curriculum_id IN (
        SELECT id FROM curriculums WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM curriculums
      WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  async function seedPrerequisites(): Promise<string> {
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();

    const parishList = await parishService.listParishes({
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
      throw new Error('Expected demo parish after prerequisite seeds.');
    }

    return parish.id;
  }

  it('refuses to run when curriculum-demo prerequisites are missing', async () => {
    await parishAcademicSeedService.run();

    await expect(questionBankDemoSeedService.run()).rejects.toBeInstanceOf(
      QuestionBankDemoSeedPrerequisiteError,
    );
  });

  it('creates published demo questions with tags, links, and valid answers on first run', async () => {
    const parishId = await seedPrerequisites();

    const firstSummary = await questionBankDemoSeedService.run();

    expect(firstSummary.tagsCreated).toBe(QUESTION_BANK_DEMO_TAGS.length);
    expect(firstSummary.questionsCreated).toBe(QUESTION_BANK_DEMO_QUESTIONS.length);
    expect(firstSummary.questionsPublished).toBe(
      QUESTION_BANK_DEMO_QUESTIONS.filter((question) => question.publish).length,
    );
    expect(firstSummary.curriculumLinksCreated).toBe(1);

    const listResult = await questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 50,
      sortBy: 'updatedAt',
      sort: 'DESC',
    });

    const demoQuestions = listResult.items.filter((item) => item.code?.startsWith('qb-demo-'));
    expect(demoQuestions.length).toBe(QUESTION_BANK_DEMO_QUESTIONS.length);

    const publishedSingle = demoQuestions.find((item) => item.code === 'qb-demo-single-001');
    expect(publishedSingle).toBeDefined();
    expect(publishedSingle?.hasPublished).toBe(true);
    expect(publishedSingle?.hasDraft).toBe(false);

    const draftQuestion = demoQuestions.find((item) => item.code === 'qb-demo-draft-001');
    expect(draftQuestion).toBeDefined();
    expect(draftQuestion?.hasDraft).toBe(true);
    expect(draftQuestion?.hasPublished).toBe(false);

    const versions = await questionBankService.listVersionsByQuestion(publishedSingle!.id, {});
    const publishedVersion = versions.find(
      (version) => version.status === QuestionVersionStatus.Published,
    );
    expect(publishedVersion).toBeDefined();

    const options = await questionOptionService.listOptionsByVersion(publishedVersion!.id);
    expect(options.length).toBeGreaterThanOrEqual(2);

    const authoring = await questionBankService.getAuthoringSnapshot(publishedVersion!.id);
    expect(authoring.correctOptionIds.length).toBe(1);
  });

  it('is idempotent on second run', async () => {
    await seedPrerequisites();
    await questionBankDemoSeedService.run();

    const secondSummary = await questionBankDemoSeedService.run();

    expect(secondSummary.questionsCreated).toBe(0);
    expect(secondSummary.questionsExisting).toBe(QUESTION_BANK_DEMO_QUESTIONS.length);
    expect(secondSummary.questionsPublished).toBe(0);
    expect(secondSummary.questionsAlreadyPublished).toBe(
      QUESTION_BANK_DEMO_QUESTIONS.filter((question) => question.publish).length,
    );
    expect(secondSummary.tagsCreated).toBe(0);
    expect(secondSummary.tagsExisting).toBe(QUESTION_BANK_DEMO_TAGS.length);
    expect(secondSummary.tagLinksCreated).toBe(0);
    expect(secondSummary.curriculumLinksCreated).toBe(0);
  });
});
