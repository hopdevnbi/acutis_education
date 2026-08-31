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
import { QuestionType } from '../../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../../src/modules/question-bank/enums/question-version-status.enum';
import {
  QuestionCodeAlreadyExistsError,
  QuestionTagCodeAlreadyExistsError,
  QuestionTagLinkAlreadyExistsError,
  QuestionCurriculumLinkAlreadyExistsError,
} from '../../src/modules/question-bank/errors/question-bank.errors';
import { QuestionBankService } from '../../src/modules/question-bank/services/question-bank.service';
import { QuestionCurriculumLinkService } from '../../src/modules/question-bank/services/question-curriculum-link.service';
import { QuestionTagService } from '../../src/modules/question-bank/services/question-tag.service';

const TEST_CODE_PREFIX = 'qb003-int-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

describe('Question bank metadata integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let catechismLevelService: CatechismLevelService;
  let curriculumService: CurriculumService;
  let questionBankService: QuestionBankService;
  let questionTagService: QuestionTagService;
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
    questionTagService = moduleRef.get(QuestionTagService);
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
      DELETE FROM question_tag_links
      WHERE question_id IN (
        SELECT id FROM questions WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM question_tags
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
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

  async function seedParishLevelAndCurriculum(): Promise<{
    parishId: string;
    catechismLevelId: string;
    curriculumId: string;
    userId: string;
  }> {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Question Bank Integration Parish',
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

    return {
      parishId: parish.id,
      catechismLevelId: catechismLevel.id,
      curriculumId: curriculum.id,
      userId,
    };
  }

  it('creates a question with initial draft version', async () => {
    const { parishId, userId } = await seedParishLevelAndCurriculum();

    const result = await questionBankService.createQuestion(parishId, {
      code: `${TEST_CODE_PREFIX}q-create`,
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'Câu hỏi về Bí tích Rửa Tội?',
      },
    });

    expect(result.question.sourceLocale).toBe('vi-VN');
    expect(result.initialVersion.status).toBe(QuestionVersionStatus.Draft);
    expect(result.initialVersion.prompt).toBe('Câu hỏi về Bí tích Rửa Tội?');
  });

  it('maps duplicate question codes to QuestionCodeAlreadyExistsError', async () => {
    const { parishId, userId } = await seedParishLevelAndCurriculum();
    const duplicateCode = `${TEST_CODE_PREFIX}dup-q`;

    await questionBankService.createQuestion(parishId, {
      code: duplicateCode,
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: { questionType: QuestionType.TrueFalse },
    });

    await expect(
      questionBankService.createQuestion(parishId, {
        code: duplicateCode,
        sourceLocale: 'vi-VN',
        createdByUserId: userId,
        draft: { questionType: QuestionType.TrueFalse },
      }),
    ).rejects.toBeInstanceOf(QuestionCodeAlreadyExistsError);
  });

  it('updates question metadata and lists by parish', async () => {
    const { parishId, userId } = await seedParishLevelAndCurriculum();

    const created = await questionBankService.createQuestion(parishId, {
      code: `${TEST_CODE_PREFIX}q-update`,
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: { questionType: QuestionType.TrueFalse, prompt: 'Original prompt' },
    });

    const updated = await questionBankService.updateQuestion(created.question.id, {
      code: `${TEST_CODE_PREFIX}q-updated`,
    });

    expect(updated.code).toBe(`${TEST_CODE_PREFIX}q-updated`);

    const list = await questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sort: 'DESC',
    });

    expect(list.total).toBeGreaterThanOrEqual(1);
    expect(
      list.items.some((item) => normalizeUuid(item.id) === normalizeUuid(created.question.id)),
    ).toBe(true);
  });

  it('creates tags, links them to questions, and lists linked tags', async () => {
    const { parishId, userId } = await seedParishLevelAndCurriculum();

    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: { questionType: QuestionType.SingleChoice, prompt: 'Tagged question' },
    });

    const tag = await questionTagService.createTag(parishId, {
      code: `${TEST_CODE_PREFIX}tag-sacraments`,
      name: 'Bí tích',
    });

    const link = await questionTagService.linkTag(created.question.id, tag.id);
    expect(normalizeUuid(link.questionId)).toBe(normalizeUuid(created.question.id));
    expect(normalizeUuid(link.tagId)).toBe(normalizeUuid(tag.id));

    const tags = await questionTagService.listTagsByQuestion(created.question.id);
    expect(tags).toHaveLength(1);
    expect(tags[0]?.code).toBe(`${TEST_CODE_PREFIX}tag-sacraments`);
  });

  it('maps duplicate tag codes to QuestionTagCodeAlreadyExistsError', async () => {
    const { parishId } = await seedParishLevelAndCurriculum();
    const duplicateCode = `${TEST_CODE_PREFIX}dup-tag`;

    await questionTagService.createTag(parishId, {
      code: duplicateCode,
      name: 'First tag',
    });

    await expect(
      questionTagService.createTag(parishId, {
        code: duplicateCode,
        name: 'Second tag',
      }),
    ).rejects.toBeInstanceOf(QuestionTagCodeAlreadyExistsError);
  });

  it('rejects duplicate tag links', async () => {
    const { parishId, userId } = await seedParishLevelAndCurriculum();

    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: { questionType: QuestionType.TrueFalse },
    });

    const tag = await questionTagService.createTag(parishId, {
      code: `${TEST_CODE_PREFIX}tag-link-dup`,
      name: 'Duplicate link tag',
    });

    await questionTagService.linkTag(created.question.id, tag.id);

    await expect(questionTagService.linkTag(created.question.id, tag.id)).rejects.toBeInstanceOf(
      QuestionTagLinkAlreadyExistsError,
    );
  });

  it('creates curriculum links and rejects duplicates', async () => {
    const { parishId, userId, curriculumId } = await seedParishLevelAndCurriculum();

    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: { questionType: QuestionType.SingleChoice, prompt: 'Linked question' },
    });

    const link = await questionCurriculumLinkService.createLink(created.question.id, {
      curriculumId,
    });

    expect(normalizeUuid(link.curriculumId)).toBe(normalizeUuid(curriculumId));
    expect(normalizeUuid(link.questionId)).toBe(normalizeUuid(created.question.id));

    const links = await questionCurriculumLinkService.listLinksByQuestion(created.question.id);
    expect(links).toHaveLength(1);

    await expect(
      questionCurriculumLinkService.createLink(created.question.id, { curriculumId }),
    ).rejects.toBeInstanceOf(QuestionCurriculumLinkAlreadyExistsError);
  });
});
