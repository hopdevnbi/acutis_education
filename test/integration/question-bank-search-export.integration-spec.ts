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
import { QUESTION_EXPORT_SCHEMA_VERSION } from '../../src/modules/question-bank/constants/question-import.constants';
import { QuestionDifficulty } from '../../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../../src/modules/question-bank/enums/question-version-status.enum';
import { QuestionListFilterRequiresCurriculumIdError } from '../../src/modules/question-bank/errors/question-bank.errors';
import { QuestionBankService } from '../../src/modules/question-bank/services/question-bank.service';
import { QuestionCurriculumLinkService } from '../../src/modules/question-bank/services/question-curriculum-link.service';
import { QuestionOptionService } from '../../src/modules/question-bank/services/question-option.service';
import { QuestionTagService } from '../../src/modules/question-bank/services/question-tag.service';

const TEST_CODE_PREFIX = 'qb007-int-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

describe('Question bank search/export integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let catechismLevelService: CatechismLevelService;
  let curriculumService: CurriculumService;
  let questionBankService: QuestionBankService;
  let questionOptionService: QuestionOptionService;
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
    questionOptionService = moduleRef.get(QuestionOptionService);
    questionTagService = moduleRef.get(QuestionTagService);
    questionCurriculumLinkService = moduleRef.get(QuestionCurriculumLinkService);
  });

  afterEach(async () => {
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
      name: 'Search Parish',
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

  async function publishVersion(versionId: string, userId: string): Promise<string> {
    const options = await questionOptionService.replaceDraftOptions(versionId, [
      { code: 'a', text: 'Đáp án A', sortOrder: 1 },
      { code: 'b', text: 'Đáp án B', sortOrder: 2 },
    ]);
    const firstOption = options[0];
    expect(firstOption).toBeDefined();
    await questionOptionService.setCorrectOptions(versionId, [firstOption.id]);
    const published = await questionBankService.publishDraftVersion(versionId, userId);
    return published.id;
  }

  it('filters by Unicode prompt search, tag, curriculum, and returns unique roots', async () => {
    const { parishId, curriculumId, userId } = await seedParishCurriculumAndUser();

    const created = await questionBankService.createQuestion(parishId, {
      code: `${TEST_CODE_PREFIX}unicode-q`,
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'Câu hỏi về Bí tích Rửa tội',
        difficulty: QuestionDifficulty.Easy,
      },
    });

    const tag = await questionTagService.createTag(parishId, {
      code: `${TEST_CODE_PREFIX}tag-sacraments`,
      name: 'Bí tích',
    });
    await questionTagService.linkTag(created.question.id, tag.id);
    await questionCurriculumLinkService.createLink(created.question.id, { curriculumId });

    const searchResult = await questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'updatedAt',
      sort: 'DESC',
      search: 'Bí tích',
      hasDraft: true,
      questionType: QuestionType.SingleChoice,
      difficulty: QuestionDifficulty.Easy,
      tagCode: `${TEST_CODE_PREFIX}tag-sacraments`,
      curriculumId,
    });

    expect(searchResult.total).toBe(1);
    expect(searchResult.items).toHaveLength(1);
    expect(searchResult.items[0]?.hasDraft).toBe(true);
    expect(searchResult.items[0]?.currentDraftVersion?.questionType).toBe(
      QuestionType.SingleChoice,
    );
  });

  it('rejects canonicalLessonKey without curriculumId', async () => {
    const { parishId } = await seedParishCurriculumAndUser();

    await expect(
      questionBankService.listQuestionsByParish(parishId, {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sort: 'DESC',
        canonicalLessonKey: generateUuidV4(),
      }),
    ).rejects.toBeInstanceOf(QuestionListFilterRequiresCurriculumIdError);
  });

  it('exports a version package and validates import without DB mutation', async () => {
    const { parishId, userId } = await seedParishCurriculumAndUser();

    const created = await questionBankService.createQuestion(parishId, {
      code: `${TEST_CODE_PREFIX}export-q`,
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'Export prompt',
        difficulty: QuestionDifficulty.Medium,
      },
    });

    const publishedVersionId = await publishVersion(created.initialVersion.id, userId);
    const exportPackage = await questionBankService.exportQuestionVersion(publishedVersionId);

    expect(exportPackage.schemaVersion).toBe(QUESTION_EXPORT_SCHEMA_VERSION);
    expect(exportPackage.correctOptionKeys).toEqual(['a']);
    expect(exportPackage.sourceLocale).toBe('vi-VN');

    const beforeCount = await AppDataSource.query<Array<{ total: number }>>(
      `
      SELECT COUNT(*) AS total FROM questions WHERE parish_id = @0
    `,
      [parishId],
    );

    const validation = await questionBankService.validateQuestionImport(parishId, {
      ...exportPackage,
      sourceQuestionCode: `${TEST_CODE_PREFIX}import-new`,
    });

    const afterCount = await AppDataSource.query<Array<{ total: number }>>(
      `
      SELECT COUNT(*) AS total FROM questions WHERE parish_id = @0
    `,
      [parishId],
    );

    expect(validation.valid).toBe(true);
    expect(beforeCount[0]?.total).toBe(afterCount[0]?.total);
  });

  it('reports hasPublished only for current published version pointer', async () => {
    const { parishId, userId } = await seedParishCurriculumAndUser();

    const created = await questionBankService.createQuestion(parishId, {
      code: `${TEST_CODE_PREFIX}published-q`,
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.TrueFalse,
        prompt: 'Published only',
        difficulty: QuestionDifficulty.Easy,
      },
    });

    await publishVersion(created.initialVersion.id, userId);

    const list = await questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'updatedAt',
      sort: 'DESC',
      hasPublished: true,
      versionStatus: QuestionVersionStatus.Published,
    });

    expect(list.items.some((item) => item.hasPublished)).toBe(true);
    expect(
      list.items.find((item) => normalizeUuid(item.id) === normalizeUuid(created.question.id))
        ?.currentPublishedVersion?.status,
    ).toBe(QuestionVersionStatus.Published);
  });
});
