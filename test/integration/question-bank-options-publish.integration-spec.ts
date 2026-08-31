import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4, normalizeUuid } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { CurriculumModule } from '../../src/modules/curriculum/curriculum.module';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { QuestionBankModule } from '../../src/modules/question-bank/question-bank.module';
import { TRUE_FALSE_OPTION_CODES } from '../../src/modules/question-bank/constants/question-option.constants';
import { QuestionDifficulty } from '../../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../../src/modules/question-bank/enums/question-version-status.enum';
import { QuestionPublishValidationError } from '../../src/modules/question-bank/errors/question-bank.errors';
import { QuestionBankService } from '../../src/modules/question-bank/services/question-bank.service';
import { QuestionOptionService } from '../../src/modules/question-bank/services/question-option.service';

const TEST_CODE_PREFIX = 'qb004-int-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

describe('Question bank options and publish integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let catechismLevelService: CatechismLevelService;
  let curriculumService: CurriculumService;
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
        ApplicationConfigModule,
        DatabaseModule,
        ParishModule,
        AcademicStructureModule,
        CurriculumModule,
        QuestionBankModule,
      ],
    }).compile();

    parishService = moduleRef.get(ParishService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
    curriculumService = moduleRef.get(CurriculumService);
    questionBankService = moduleRef.get(QuestionBankService);
    questionOptionService = moduleRef.get(QuestionOptionService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM question_correct_options
      WHERE question_version_id IN (
        SELECT id FROM question_versions
        WHERE question_id IN (
          SELECT id FROM questions WHERE parish_id IN (
            SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
          )
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM question_options
      WHERE question_version_id IN (
        SELECT id FROM question_versions
        WHERE question_id IN (
          SELECT id FROM questions WHERE parish_id IN (
            SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
          )
        )
      )
    `);

    await AppDataSource.query(`
      UPDATE questions
      SET current_published_version_id = NULL
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM question_versions
      WHERE question_id IN (
        SELECT id FROM questions WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM questions
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM catechism_levels WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
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

  async function insertUser(email: string): Promise<string> {
    const id = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO users (id, email, password_hash, status)
        VALUES (@0, @1, @2, @3)
      `,
      [id, email, DUMMY_PASSWORD_HASH, 'ACTIVE'],
    );

    return id;
  }

  async function seedParishAndUser(): Promise<{ parishId: string; userId: string }> {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Options Integration Parish',
    });
    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}level`,
      name: 'Level One',
      sortOrder: 1,
    });
    await curriculumService.createCurriculum(parish.id, {
      catechismLevelId: catechismLevel.id,
      code: `${TEST_CODE_PREFIX}curriculum`,
      name: 'Giáo lý Khai Tâm',
      sourceLocale: 'vi-VN',
    });
    const userId = await insertUser(`${TEST_CODE_PREFIX}user@example.com`);

    return { parishId: parish.id, userId };
  }

  it('auto-provisions true/false options when creating a TRUE_FALSE question', async () => {
    const { parishId, userId } = await seedParishAndUser();

    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: { questionType: QuestionType.TrueFalse, prompt: 'Is baptism a sacrament?' },
    });

    const options = await questionOptionService.listOptionsByVersion(created.initialVersion.id);

    expect(options).toHaveLength(2);
    expect(options.map((option) => option.code).sort()).toEqual(
      [...TRUE_FALSE_OPTION_CODES].sort(),
    );
  });

  it('replaces options, sets correct answers, and publishes a draft version', async () => {
    const { parishId, userId } = await seedParishAndUser();

    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'Which sacrament initiates Christian life?',
        difficulty: QuestionDifficulty.Medium,
      },
    });

    const versionId = created.initialVersion.id;
    const replacedOptions = await questionOptionService.replaceDraftOptions(versionId, [
      { code: 'baptism', text: 'Baptism', sortOrder: 1 },
      { code: 'confirmation', text: 'Confirmation', sortOrder: 2 },
    ]);

    const firstOption = replacedOptions[0];
    expect(firstOption).toBeDefined();

    const correctOptionIds = await questionOptionService.setCorrectOptions(versionId, [
      firstOption.id,
    ]);

    expect(correctOptionIds).toHaveLength(1);

    const published = await questionBankService.publishDraftVersion(versionId, userId);

    expect(published.status).toBe(QuestionVersionStatus.Published);
    expect(published.sourceContentHash).not.toBeNull();

    const question = await questionBankService.getQuestionById(created.question.id);
    expect(normalizeUuid(question.currentPublishedVersionId!)).toBe(normalizeUuid(versionId));
  });

  it('rejects publish when validation issues remain', async () => {
    const { parishId, userId } = await seedParishAndUser();

    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: { questionType: QuestionType.SingleChoice, prompt: '' },
    });

    const issues = await questionBankService.collectPublishValidationIssues(
      created.initialVersion.id,
    );

    expect(issues.length).toBeGreaterThan(0);

    await expect(
      questionBankService.publishDraftVersion(created.initialVersion.id, userId),
    ).rejects.toBeInstanceOf(QuestionPublishValidationError);
  });
});
