import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4, normalizeUuid } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { CurriculumStatus } from '../../src/modules/curriculum/enums/curriculum-status.enum';
import { CurriculumInactiveError } from '../../src/modules/curriculum/errors/curriculum.errors';
import { CurriculumModule } from '../../src/modules/curriculum/curriculum.module';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { QuestionBankModule } from '../../src/modules/question-bank/question-bank.module';
import { QuestionDifficulty } from '../../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../../src/modules/question-bank/enums/question-version-status.enum';
import {
  QuestionNoPublishedVersionError,
  QuestionVersionNotDeliverableError,
} from '../../src/modules/question-bank/errors/question-bank.errors';
import { QuestionBankService } from '../../src/modules/question-bank/services/question-bank.service';
import { QuestionCurriculumLinkService } from '../../src/modules/question-bank/services/question-curriculum-link.service';
import { QuestionOptionService } from '../../src/modules/question-bank/services/question-option.service';

const TEST_CODE_PREFIX = 'qb006-int-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

describe('Question bank scoped delivery integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let catechismLevelService: CatechismLevelService;
  let curriculumService: CurriculumService;
  let questionBankService: QuestionBankService;
  let questionOptionService: QuestionOptionService;
  let questionCurriculumLinkService: QuestionCurriculumLinkService;

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
    questionCurriculumLinkService = moduleRef.get(QuestionCurriculumLinkService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM question_curriculum_links
      WHERE question_id IN (
        SELECT id FROM questions WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

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

  async function seedParishCurriculumAndUser(): Promise<{
    parishId: string;
    curriculumId: string;
    userId: string;
  }> {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Scoped Delivery Parish',
    });
    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}level`,
      name: 'Level One',
      sortOrder: 1,
    });
    const curriculum = await curriculumService.createCurriculum(parish.id, {
      catechismLevelId: catechismLevel.id,
      code: `${TEST_CODE_PREFIX}curriculum`,
      name: 'Giáo lý Khai Tâm',
      sourceLocale: 'vi-VN',
    });
    const userId = await insertUser(`${TEST_CODE_PREFIX}user@example.com`);

    return { parishId: parish.id, curriculumId: curriculum.id, userId };
  }

  async function createDraftQuestion(
    parishId: string,
    userId: string,
  ): Promise<{ questionId: string; versionId: string }> {
    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'Which sacrament begins Christian life?',
        difficulty: QuestionDifficulty.Medium,
      },
    });

    return {
      questionId: created.question.id,
      versionId: created.initialVersion.id,
    };
  }

  async function publishQuestionVersion(versionId: string, userId: string): Promise<string> {
    const replacedOptions = await questionOptionService.replaceDraftOptions(versionId, [
      { code: 'baptism', text: 'Baptism', sortOrder: 1 },
      { code: 'confirmation', text: 'Confirmation', sortOrder: 2 },
    ]);

    const firstOption = replacedOptions[0];
    expect(firstOption).toBeDefined();

    await questionOptionService.setCorrectOptions(versionId, [firstOption.id]);
    const published = await questionBankService.publishDraftVersion(versionId, userId);

    return published.id;
  }

  it('rejects new curriculum links when curriculum is inactive but preserves historical links', async () => {
    const { parishId, curriculumId, userId } = await seedParishCurriculumAndUser();
    const { questionId } = await createDraftQuestion(parishId, userId);

    const link = await questionCurriculumLinkService.createLink(questionId, { curriculumId });
    expect(link.curriculumId).toBe(curriculumId);

    await curriculumService.updateCurriculumStatus(curriculumId, CurriculumStatus.Inactive);

    await expect(
      questionCurriculumLinkService.createLink(questionId, { curriculumId }),
    ).rejects.toBeInstanceOf(CurriculumInactiveError);

    const links = await questionCurriculumLinkService.listLinksByQuestion(questionId);
    expect(links).toHaveLength(1);
    expect(normalizeUuid(links[0]?.curriculumId ?? '')).toBe(normalizeUuid(curriculumId));
  });

  it('rejects learner projection for draft versions and allows author preview', async () => {
    const { parishId, userId } = await seedParishCurriculumAndUser();
    const { versionId } = await createDraftQuestion(parishId, userId);

    await expect(
      questionBankService.getLearnerQuestionProjection(versionId),
    ).rejects.toBeInstanceOf(QuestionVersionNotDeliverableError);

    const preview = await questionBankService.getQuestionVersionPreview(versionId);

    expect(preview.questionVersionId).toBe(versionId);
    expect(preview).not.toHaveProperty('correctOptionIds');
    expect(preview).not.toHaveProperty('explanation');
    for (const option of preview.options) {
      expect(option).not.toHaveProperty('code');
    }
  });

  it('returns current published selection snapshot and rejects draft-only questions', async () => {
    const { parishId, userId } = await seedParishCurriculumAndUser();
    const { questionId, versionId } = await createDraftQuestion(parishId, userId);

    await expect(
      questionBankService.getCurrentPublishedQuestionForSelection(questionId),
    ).rejects.toBeInstanceOf(QuestionNoPublishedVersionError);

    const publishedVersionId = await publishQuestionVersion(versionId, userId);
    const selection = await questionBankService.getCurrentPublishedQuestionForSelection(questionId);

    expect(normalizeUuid(selection.questionId)).toBe(normalizeUuid(questionId));
    expect(normalizeUuid(selection.questionVersionId)).toBe(normalizeUuid(publishedVersionId));
    expect(selection.questionType).toBe(QuestionType.SingleChoice);
    expect(selection.sourceLocale).toBe('vi-VN');
    expect(selection.sourceContentHash).not.toBeNull();
  });

  it('allows learner projection for published versions and revalidates on publish', async () => {
    const { parishId, userId } = await seedParishCurriculumAndUser();
    const { versionId } = await createDraftQuestion(parishId, userId);
    const publishedVersionId = await publishQuestionVersion(versionId, userId);

    const published = await questionBankService.getVersionById(publishedVersionId);
    expect(published.status).toBe(QuestionVersionStatus.Published);

    const projection = await questionBankService.getLearnerQuestionProjection(publishedVersionId);

    expect(projection.questionVersionId).toBe(publishedVersionId);
    expect(projection).not.toHaveProperty('correctOptionIds');
    expect(projection).not.toHaveProperty('explanation');
    expect(projection.options[0]).not.toHaveProperty('code');
  });
});
