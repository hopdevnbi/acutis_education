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
import { QuestionDifficulty } from '../../src/modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../../src/modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../../src/modules/question-bank/enums/question-version-status.enum';
import {
  QuestionDraftAlreadyExistsError,
  QuestionVersionNotCloneableError,
} from '../../src/modules/question-bank/errors/question-bank.errors';
import { QuestionBankService } from '../../src/modules/question-bank/services/question-bank.service';
import { QuestionOptionService } from '../../src/modules/question-bank/services/question-option.service';

const TEST_CODE_PREFIX = 'qb005-int-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

describe('Question bank clone and grading integration (MSSQL)', () => {
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
      name: 'Clone Integration Parish',
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

  async function createPublishedSingleChoiceQuestion(
    parishId: string,
    userId: string,
  ): Promise<{ questionId: string; versionId: string; optionIds: string[] }> {
    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'Which sacrament begins Christian life?',
        difficulty: QuestionDifficulty.Medium,
      },
    });

    const versionId = created.initialVersion.id;
    const replacedOptions = await questionOptionService.replaceDraftOptions(versionId, [
      { code: 'baptism', text: 'Baptism', sortOrder: 1 },
      { code: 'confirmation', text: 'Confirmation', sortOrder: 2 },
    ]);

    const firstReplacedOption = replacedOptions[0];
    expect(firstReplacedOption).toBeDefined();

    await questionOptionService.setCorrectOptions(versionId, [firstReplacedOption.id]);
    const published = await questionBankService.publishDraftVersion(versionId, userId);

    return {
      questionId: created.question.id,
      versionId: published.id,
      optionIds: replacedOptions.map((option) => option.id),
    };
  }

  it('clones published version to draft with remapped options and stable source hash', async () => {
    const { parishId, userId } = await seedParishAndUser();
    const published = await createPublishedSingleChoiceQuestion(parishId, userId);
    const sourceVersion = await questionBankService.getVersionById(published.versionId);

    const cloned = await questionBankService.cloneVersionToDraft(published.versionId, userId);

    expect(cloned.version.status).toBe(QuestionVersionStatus.Draft);
    expect(cloned.version.versionNumber).toBe(2);
    expect(cloned.options).toHaveLength(2);
    expect(cloned.options.map((option) => option.id)).not.toEqual(published.optionIds);
    expect(cloned.correctOptionIds).toHaveLength(1);
    expect(cloned.correctOptionIds[0]).not.toBe(published.optionIds[0]);
    expect(cloned.version.sourceContentHash).toBe(sourceVersion.sourceContentHash);

    const firstPublishedOptionId = published.optionIds[0];
    expect(firstPublishedOptionId).toBeDefined();

    const gradeV1 = await questionBankService.gradeAnswer({
      questionVersionId: published.versionId,
      selectedOptionIds: [firstPublishedOptionId],
    });
    expect(gradeV1.isCorrect).toBe(true);
  });

  it('publishes cloned draft, archives previous version, and grades both historical versions', async () => {
    const { parishId, userId } = await seedParishAndUser();
    const published = await createPublishedSingleChoiceQuestion(parishId, userId);
    const cloned = await questionBankService.cloneVersionToDraft(published.versionId, userId);

    const publishedV2 = await questionBankService.publishDraftVersion(cloned.version.id, userId);
    const archivedV1 = await questionBankService.getVersionById(published.versionId);
    const question = await questionBankService.getQuestionById(published.questionId);

    expect(publishedV2.status).toBe(QuestionVersionStatus.Published);
    expect(archivedV1.status).toBe(QuestionVersionStatus.Archived);
    expect(normalizeUuid(question.currentPublishedVersionId!)).toBe(normalizeUuid(publishedV2.id));

    const firstPublishedOptionId = published.optionIds[0];
    expect(firstPublishedOptionId).toBeDefined();

    const gradeV1 = await questionBankService.gradeAnswer({
      questionVersionId: published.versionId,
      selectedOptionIds: [firstPublishedOptionId],
    });
    const firstClonedCorrectOptionId = cloned.correctOptionIds[0];
    expect(firstClonedCorrectOptionId).toBeDefined();

    const gradeV2 = await questionBankService.gradeAnswer({
      questionVersionId: publishedV2.id,
      selectedOptionIds: [firstClonedCorrectOptionId],
    });

    expect(gradeV1.isCorrect).toBe(true);
    expect(gradeV2.isCorrect).toBe(true);
  });

  it('rejects cloning draft source and existing draft conflicts', async () => {
    const { parishId, userId } = await seedParishAndUser();
    const created = await questionBankService.createQuestion(parishId, {
      sourceLocale: 'vi-VN',
      createdByUserId: userId,
      draft: {
        questionType: QuestionType.SingleChoice,
        prompt: 'Draft only',
        difficulty: QuestionDifficulty.Easy,
      },
    });

    await expect(
      questionBankService.cloneVersionToDraft(created.initialVersion.id, userId),
    ).rejects.toBeInstanceOf(QuestionVersionNotCloneableError);

    const published = await createPublishedSingleChoiceQuestion(parishId, userId);
    await questionBankService.cloneVersionToDraft(published.versionId, userId);

    await expect(
      questionBankService.cloneVersionToDraft(published.versionId, userId),
    ).rejects.toBeInstanceOf(QuestionDraftAlreadyExistsError);
  });

  it('returns learner projection and immutable assessment snapshot without answer leakage', async () => {
    const { parishId, userId } = await seedParishAndUser();
    const published = await createPublishedSingleChoiceQuestion(parishId, userId);

    const learnerProjection = await questionBankService.getLearnerQuestionProjection(
      published.versionId,
    );
    const snapshot = await questionBankService.getImmutableAssessmentSnapshot(published.versionId);

    expect(learnerProjection).not.toHaveProperty('correctOptionIds');
    expect(learnerProjection).not.toHaveProperty('explanation');
    expect(learnerProjection.options[0]).not.toHaveProperty('code');
    expect(snapshot.correctOptionIds).toHaveLength(1);
    expect(snapshot.sourceLocale).toBe('vi-VN');
  });
});
