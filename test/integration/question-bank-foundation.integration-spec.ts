import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'qb002-';
const VALID_SOURCE_HASH = '0123456789abcdef'.repeat(4);

async function insertParish(code: string, name: string): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `INSERT INTO parishes (id, code, name, status) VALUES (@0, @1, @2, @3)`,
    [id, code, name, 'ACTIVE'],
  );

  return id;
}

async function insertCatechismLevel(
  parishId: string,
  code: string,
  name: string,
  sortOrder: number,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO catechism_levels (id, parish_id, code, name, sort_order, status)
      VALUES (@0, @1, @2, @3, @4, @5)
    `,
    [id, parishId, code, name, sortOrder, 'ACTIVE'],
  );

  return id;
}

async function insertCurriculum(
  parishId: string,
  catechismLevelId: string,
  code: string,
  name: string,
  sourceLocale: string,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO curriculums (
        id, parish_id, catechism_level_id, code, name, status, source_locale
      )
      VALUES (@0, @1, @2, @3, @4, @5, @6)
    `,
    [id, parishId, catechismLevelId, code, name, 'ACTIVE', sourceLocale],
  );

  return id;
}

async function insertQuestion(
  parishId: string,
  sourceLocale: string,
  code: string | null = null,
  createdByUserId: string | null = null,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO questions (
        id, parish_id, code, status, source_locale, created_by_user_id
      )
      VALUES (@0, @1, @2, @3, @4, @5)
    `,
    [id, parishId, code, 'ACTIVE', sourceLocale, createdByUserId],
  );

  return id;
}

async function insertQuestionVersion(input: {
  questionId: string;
  versionNumber: number;
  status: string;
  questionType: string;
  prompt: string;
  publishedAt: Date | null;
  publishedByUserId: string | null;
  createdByUserId: string | null;
  sourceContentHash?: string | null;
  promptMediaJson?: string | null;
  difficulty?: string | null;
}): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO question_versions (
        id,
        question_id,
        version_number,
        status,
        question_type,
        prompt,
        published_at,
        published_by_user_id,
        created_by_user_id,
        source_content_hash,
        prompt_media_json,
        difficulty
      )
      VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11)
    `,
    [
      id,
      input.questionId,
      input.versionNumber,
      input.status,
      input.questionType,
      input.prompt,
      input.publishedAt,
      input.publishedByUserId,
      input.createdByUserId,
      input.sourceContentHash ?? null,
      input.promptMediaJson ?? null,
      input.difficulty ?? null,
    ],
  );

  return id;
}

async function insertQuestionOption(input: {
  questionVersionId: string;
  text: string | null;
  mediaAssetId: string | null;
  sortOrder: number;
  code?: string | null;
  id?: string;
}): Promise<string> {
  const id = input.id ?? generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO question_options (
        id, question_version_id, code, text, media_asset_id, sort_order
      )
      VALUES (@0, @1, @2, @3, @4, @5)
    `,
    [
      id,
      input.questionVersionId,
      input.code ?? null,
      input.text,
      input.mediaAssetId,
      input.sortOrder,
    ],
  );

  return id;
}

async function insertQuestionCorrectOption(
  questionVersionId: string,
  optionId: string,
): Promise<void> {
  await AppDataSource.query(
    `
      INSERT INTO question_correct_options (question_version_id, option_id)
      VALUES (@0, @1)
    `,
    [questionVersionId, optionId],
  );
}

async function insertQuestionTag(parishId: string, code: string, name: string): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO question_tags (id, parish_id, code, name, status)
      VALUES (@0, @1, @2, @3, @4)
    `,
    [id, parishId, code, name, 'ACTIVE'],
  );

  return id;
}

async function insertQuestionTagLink(questionId: string, tagId: string): Promise<void> {
  await AppDataSource.query(
    `INSERT INTO question_tag_links (question_id, tag_id) VALUES (@0, @1)`,
    [questionId, tagId],
  );
}

async function insertQuestionCurriculumLink(input: {
  questionId: string;
  parishId: string;
  curriculumId: string;
  canonicalLessonKey?: string | null;
}): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO question_curriculum_links (
        id, question_id, parish_id, curriculum_id, canonical_lesson_key
      )
      VALUES (@0, @1, @2, @3, @4)
    `,
    [id, input.questionId, input.parishId, input.curriculumId, input.canonicalLessonKey ?? null],
  );

  return id;
}

describe('Question bank foundation integration (MSSQL)', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }
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
      DELETE FROM question_correct_options
      WHERE question_version_id IN (
        SELECT qv.id FROM question_versions qv
        INNER JOIN questions q ON q.id = qv.question_id
        WHERE q.parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
      )
    `);

    await AppDataSource.query(`
      DELETE FROM question_options
      WHERE question_version_id IN (
        SELECT qv.id FROM question_versions qv
        INNER JOIN questions q ON q.id = qv.question_id
        WHERE q.parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
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
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates required question bank tables', async () => {
    const tables = await AppDataSource.query<Array<{ TABLE_NAME: string }>>(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME IN (
          'questions',
          'question_versions',
          'question_options',
          'question_correct_options',
          'question_tags',
          'question_tag_links',
          'question_curriculum_links'
        )
      ORDER BY TABLE_NAME
    `);

    expect(tables.map((row) => row.TABLE_NAME)).toEqual([
      'question_correct_options',
      'question_curriculum_links',
      'question_options',
      'question_tag_links',
      'question_tags',
      'question_versions',
      'questions',
    ]);
  });

  it('stores question bank primary keys without database-generated UUID defaults', async () => {
    const defaultConstraintResult = await AppDataSource.query<
      Array<{ table_name: string; column_name: string; default_definition: string | null }>
    >(`
      SELECT
        t.name AS table_name,
        c.name AS column_name,
        dc.definition AS default_definition
      FROM sys.tables t
      INNER JOIN sys.columns c
        ON c.object_id = t.object_id
      LEFT JOIN sys.default_constraints dc
        ON dc.parent_object_id = c.object_id
        AND dc.parent_column_id = c.column_id
      WHERE t.name IN (
        'questions',
        'question_versions',
        'question_options',
        'question_tags',
        'question_curriculum_links'
      )
        AND c.name = 'id'
      ORDER BY t.name
    `);

    expect(defaultConstraintResult).toHaveLength(5);
    expect(defaultConstraintResult.every((row) => row.default_definition === null)).toBe(true);
  });

  it('does not create a foreign key from question_options.media_asset_id to media_assets', async () => {
    const foreignKeys = await AppDataSource.query<Array<{ fk_name: string }>>(`
      SELECT fk.name AS fk_name
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc
        ON fkc.constraint_object_id = fk.object_id
      INNER JOIN sys.columns c
        ON c.object_id = fkc.parent_object_id
        AND c.column_id = fkc.parent_column_id
      INNER JOIN sys.tables t
        ON t.object_id = fk.parent_object_id
      WHERE t.name = 'question_options'
        AND c.name = 'media_asset_id'
    `);

    expect(foreignKeys).toHaveLength(0);
  });

  it('persists sourceLocale and Unicode question text', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-locale`, 'Locale Parish');
    const questionId = await insertQuestion(parishId, 'fr-FR', `${TEST_CODE_PREFIX}q-locale`);

    await insertQuestionVersion({
      questionId,
      versionNumber: 1,
      status: 'DRAFT',
      questionType: 'SINGLE_CHOICE',
      prompt: 'Giáo lý — Église: quelle est la réponse?',
      publishedAt: null,
      publishedByUserId: null,
      createdByUserId: null,
    });

    const rows = await AppDataSource.query<Array<{ source_locale: string; prompt: string }>>(
      `
        SELECT q.source_locale, qv.prompt
        FROM questions q
        INNER JOIN question_versions qv ON qv.question_id = q.id
        WHERE q.id = @0
      `,
      [questionId],
    );

    expect(rows[0]?.source_locale).toBe('fr-FR');
    expect(rows[0]?.prompt).toBe('Giáo lý — Église: quelle est la réponse?');
  });

  it('enforces one DRAFT version per question', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-draft`, 'Draft Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');

    await insertQuestionVersion({
      questionId,
      versionNumber: 1,
      status: 'DRAFT',
      questionType: 'TRUE_FALSE',
      prompt: 'Draft one',
      publishedAt: null,
      publishedByUserId: null,
      createdByUserId: null,
    });

    await expect(
      insertQuestionVersion({
        questionId,
        versionNumber: 2,
        status: 'DRAFT',
        questionType: 'TRUE_FALSE',
        prompt: 'Draft two',
        publishedAt: null,
        publishedByUserId: null,
        createdByUserId: null,
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate version numbers for the same question', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-version`, 'Version Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');
    const publishedAt = new Date('2026-08-31T00:00:00.000Z');

    await insertQuestionVersion({
      questionId,
      versionNumber: 1,
      status: 'PUBLISHED',
      questionType: 'SINGLE_CHOICE',
      prompt: 'Published v1',
      publishedAt,
      publishedByUserId: null,
      createdByUserId: null,
    });

    await expect(
      insertQuestionVersion({
        questionId,
        versionNumber: 1,
        status: 'ARCHIVED',
        questionType: 'SINGLE_CHOICE',
        prompt: 'Duplicate number',
        publishedAt,
        publishedByUserId: null,
        createdByUserId: null,
      }),
    ).rejects.toThrow();
  });

  it('rejects invalid question type and published_at mismatch', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-checks`, 'Checks Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');

    await expect(
      insertQuestionVersion({
        questionId,
        versionNumber: 1,
        status: 'DRAFT',
        questionType: 'SHORT_TEXT',
        prompt: 'Invalid type',
        publishedAt: null,
        publishedByUserId: null,
        createdByUserId: null,
      }),
    ).rejects.toThrow();

    await expect(
      insertQuestionVersion({
        questionId,
        versionNumber: 1,
        status: 'PUBLISHED',
        questionType: 'SINGLE_CHOICE',
        prompt: 'Missing published_at',
        publishedAt: null,
        publishedByUserId: null,
        createdByUserId: null,
      }),
    ).rejects.toThrow();
  });

  it('rejects invalid source_content_hash and non-JSON media fields', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-json`, 'Json Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');

    await expect(
      insertQuestionVersion({
        questionId,
        versionNumber: 1,
        status: 'DRAFT',
        questionType: 'SINGLE_CHOICE',
        prompt: 'Hash invalid',
        publishedAt: null,
        publishedByUserId: null,
        createdByUserId: null,
        sourceContentHash: 'NOT_A_VALID_HASH',
      }),
    ).rejects.toThrow();

    await expect(
      insertQuestionVersion({
        questionId,
        versionNumber: 1,
        status: 'DRAFT',
        questionType: 'SINGLE_CHOICE',
        prompt: 'Json invalid',
        publishedAt: null,
        publishedByUserId: null,
        createdByUserId: null,
        promptMediaJson: 'not-json',
      }),
    ).rejects.toThrow();
  });

  it('accepts valid source_content_hash and JSON media fields', async () => {
    const parishId = await insertParish(
      `${TEST_CODE_PREFIX}parish-valid-json`,
      'Valid Json Parish',
    );
    const questionId = await insertQuestion(parishId, 'vi-VN');

    const versionId = await insertQuestionVersion({
      questionId,
      versionNumber: 1,
      status: 'DRAFT',
      questionType: 'MULTIPLE_CHOICE',
      prompt: 'Valid json',
      publishedAt: null,
      publishedByUserId: null,
      createdByUserId: null,
      sourceContentHash: VALID_SOURCE_HASH,
      promptMediaJson: '{"schemaVersion":1,"items":[]}',
      difficulty: 'MEDIUM',
    });

    const rows = await AppDataSource.query<
      Array<{ source_content_hash: string; difficulty: string }>
    >(`SELECT source_content_hash, difficulty FROM question_versions WHERE id = @0`, [versionId]);

    expect(rows[0]?.source_content_hash).toBe(VALID_SOURCE_HASH);
    expect(rows[0]?.difficulty).toBe('MEDIUM');
  });

  it('enforces option representation and sort order constraints', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-option`, 'Option Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');
    const versionId = await insertQuestionVersion({
      questionId,
      versionNumber: 1,
      status: 'DRAFT',
      questionType: 'SINGLE_CHOICE',
      prompt: 'Option constraints',
      publishedAt: null,
      publishedByUserId: null,
      createdByUserId: null,
    });

    await expect(
      insertQuestionOption({
        questionVersionId: versionId,
        text: null,
        mediaAssetId: null,
        sortOrder: 0,
      }),
    ).rejects.toThrow();

    await insertQuestionOption({
      questionVersionId: versionId,
      text: 'Đáp án A',
      mediaAssetId: null,
      sortOrder: 0,
    });

    await expect(
      insertQuestionOption({
        questionVersionId: versionId,
        text: 'Duplicate sort',
        mediaAssetId: null,
        sortOrder: 0,
      }),
    ).rejects.toThrow();
  });

  it('rejects correct-answer rows that reference options from another version', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-cross`, 'Cross Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');

    const versionOneId = await insertQuestionVersion({
      questionId,
      versionNumber: 1,
      status: 'PUBLISHED',
      questionType: 'SINGLE_CHOICE',
      prompt: 'Version one',
      publishedAt: new Date('2026-08-31T00:00:00.000Z'),
      publishedByUserId: null,
      createdByUserId: null,
    });

    const versionTwoId = await insertQuestionVersion({
      questionId,
      versionNumber: 2,
      status: 'ARCHIVED',
      questionType: 'SINGLE_CHOICE',
      prompt: 'Version two',
      publishedAt: new Date('2026-08-31T00:00:00.000Z'),
      publishedByUserId: null,
      createdByUserId: null,
    });

    const optionVersionOneId = await insertQuestionOption({
      questionVersionId: versionOneId,
      text: 'Option v1',
      mediaAssetId: null,
      sortOrder: 0,
    });

    await insertQuestionOption({
      questionVersionId: versionTwoId,
      text: 'Option v2',
      mediaAssetId: null,
      sortOrder: 0,
    });

    await expect(insertQuestionCorrectOption(versionTwoId, optionVersionOneId)).rejects.toThrow();

    await insertQuestionCorrectOption(versionOneId, optionVersionOneId);
  });

  it('enforces question code uniqueness per parish when code is non-null', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-code`, 'Code Parish');
    const sharedCode = `${TEST_CODE_PREFIX}shared-q-code`;

    await insertQuestion(parishId, 'vi-VN', sharedCode);

    await expect(insertQuestion(parishId, 'vi-VN', sharedCode)).rejects.toThrow();
  });

  it('allows the same question code in different parishes', async () => {
    const parishOneId = await insertParish(`${TEST_CODE_PREFIX}parish-code-a`, 'Code Parish A');
    const parishTwoId = await insertParish(`${TEST_CODE_PREFIX}parish-code-b`, 'Code Parish B');
    const sharedCode = `${TEST_CODE_PREFIX}cross-parish-code`;

    await insertQuestion(parishOneId, 'vi-VN', sharedCode);
    await expect(insertQuestion(parishTwoId, 'vi-VN', sharedCode)).resolves.toBeDefined();
  });

  it('enforces tag code uniqueness per parish', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-tag`, 'Tag Parish');
    const tagCode = `${TEST_CODE_PREFIX}tag-sacraments`;

    await insertQuestionTag(parishId, tagCode, 'Bí tích');

    await expect(insertQuestionTag(parishId, tagCode, 'Sacraments duplicate')).rejects.toThrow();
  });

  it('allows the same tag code in different parishes', async () => {
    const parishOneId = await insertParish(`${TEST_CODE_PREFIX}parish-tag-a`, 'Tag Parish A');
    const parishTwoId = await insertParish(`${TEST_CODE_PREFIX}parish-tag-b`, 'Tag Parish B');
    const tagCode = `${TEST_CODE_PREFIX}shared-tag`;

    await insertQuestionTag(parishOneId, tagCode, 'Shared tag');
    await expect(insertQuestionTag(parishTwoId, tagCode, 'Shared tag B')).resolves.toBeDefined();
  });

  it('links tags at question root scope', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-tag-link`, 'Tag Link Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');
    const tagId = await insertQuestionTag(parishId, `${TEST_CODE_PREFIX}linked-tag`, 'Liên kết');

    await insertQuestionTagLink(questionId, tagId);

    const rows = await AppDataSource.query<Array<{ question_id: string; tag_id: string }>>(
      `SELECT question_id, tag_id FROM question_tag_links WHERE question_id = @0 AND tag_id = @1`,
      [questionId, tagId],
    );

    expect(rows).toHaveLength(1);
  });

  it('prevents duplicate curriculum links for the same semantic association', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-cur-link`, 'Cur Link Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-cur`,
      'Level Cur',
      1,
    );
    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-link`,
      'Curriculum Link',
      'vi-VN',
    );
    const questionId = await insertQuestion(parishId, 'vi-VN');
    const lessonKey = generateUuidV4();

    await insertQuestionCurriculumLink({
      questionId,
      parishId,
      curriculumId,
      canonicalLessonKey: lessonKey,
    });

    await expect(
      insertQuestionCurriculumLink({
        questionId,
        parishId,
        curriculumId,
        canonicalLessonKey: lessonKey,
      }),
    ).rejects.toThrow();
  });

  it('supports circular currentPublishedVersionId foreign key', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-current`, 'Current Parish');
    const questionId = await insertQuestion(parishId, 'vi-VN');
    const publishedAt = new Date('2026-08-31T00:00:00.000Z');

    const versionId = await insertQuestionVersion({
      questionId,
      versionNumber: 1,
      status: 'PUBLISHED',
      questionType: 'TRUE_FALSE',
      prompt: 'Published current',
      publishedAt,
      publishedByUserId: null,
      createdByUserId: null,
    });

    await AppDataSource.query(
      `UPDATE questions SET current_published_version_id = @0 WHERE id = @1`,
      [versionId, questionId],
    );

    const rows = await AppDataSource.query<Array<{ current_published_version_id: string }>>(
      `SELECT current_published_version_id FROM questions WHERE id = @0`,
      [questionId],
    );

    expect(rows[0]?.current_published_version_id?.toLowerCase()).toBe(versionId.toLowerCase());
  });
});
