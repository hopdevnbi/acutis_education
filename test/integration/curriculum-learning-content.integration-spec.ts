import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'cur002-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

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

async function insertParish(code: string, name: string): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `INSERT INTO parishes (id, code, name, status) VALUES (@0, @1, @2, @3)`,
    [id, code, name, 'ACTIVE'],
  );

  return id;
}

async function insertAcademicYear(
  parishId: string,
  name: string,
  startDate: string,
  endDate: string,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO academic_years (id, parish_id, name, start_date, end_date, status)
      VALUES (@0, @1, @2, @3, @4, @5)
    `,
    [id, parishId, name, startDate, endDate, 'PLANNED'],
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

async function insertCurriculumVersion(
  curriculumId: string,
  versionNumber: number,
  status: string,
  publishedAt: Date | null,
  publishedByUserId: string | null,
  createdByUserId: string | null,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO curriculum_versions (
        id, curriculum_id, version_number, status, published_at, published_by_user_id, created_by_user_id
      )
      VALUES (@0, @1, @2, @3, @4, @5, @6)
    `,
    [id, curriculumId, versionNumber, status, publishedAt, publishedByUserId, createdByUserId],
  );

  return id;
}

async function insertTopic(
  curriculumVersionId: string,
  title: string,
  sortOrder: number,
  code: string | null = null,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO topics (id, curriculum_version_id, code, title, sort_order)
      VALUES (@0, @1, @2, @3, @4)
    `,
    [id, curriculumVersionId, code, title, sortOrder],
  );

  return id;
}

async function insertLesson(
  curriculumVersionId: string,
  topicId: string,
  canonicalLessonKey: string,
  title: string,
  sortOrder: number,
  estimatedDurationMinutes: number | null = 45,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO lessons (
        id, curriculum_version_id, topic_id, canonical_lesson_key, title, sort_order, estimated_duration_minutes
      )
      VALUES (@0, @1, @2, @3, @4, @5, @6)
    `,
    [
      id,
      curriculumVersionId,
      topicId,
      canonicalLessonKey,
      title,
      sortOrder,
      estimatedDurationMinutes,
    ],
  );

  return id;
}

async function insertLessonContent(
  lessonId: string,
  contentJson: string,
  contentHash: string | null = null,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO lesson_contents (id, lesson_id, content_schema_version, content_json, content_hash)
      VALUES (@0, @1, @2, @3, @4)
    `,
    [id, lessonId, 1, contentJson, contentHash],
  );

  return id;
}

async function insertCurriculumAssignment(
  parishId: string,
  academicYearId: string,
  catechismLevelId: string,
  curriculumVersionId: string,
  assignedByUserId: string | null,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO curriculum_assignments (
        id, parish_id, academic_year_id, catechism_level_id, curriculum_version_id, assigned_by_user_id, assigned_at
      )
      VALUES (@0, @1, @2, @3, @4, @5, GETUTCDATE())
    `,
    [id, parishId, academicYearId, catechismLevelId, curriculumVersionId, assignedByUserId],
  );

  return id;
}

describe('Curriculum learning content integration (MSSQL)', () => {
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
      DELETE FROM catechism_levels WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM academic_years WHERE name LIKE '${TEST_CODE_PREFIX}%'
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

  it('creates required curriculum learning content tables', async () => {
    const tables = await AppDataSource.query<Array<{ TABLE_NAME: string }>>(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME IN (
          'curriculums',
          'curriculum_versions',
          'topics',
          'lessons',
          'lesson_contents',
          'curriculum_assignments'
        )
      ORDER BY TABLE_NAME
    `);

    expect(tables.map((row) => row.TABLE_NAME)).toEqual([
      'curriculum_assignments',
      'curriculum_versions',
      'curriculums',
      'lesson_contents',
      'lessons',
      'topics',
    ]);
  });

  it('stores curriculum primary keys without database-generated UUID defaults', async () => {
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
        'curriculums',
        'curriculum_versions',
        'topics',
        'lessons',
        'lesson_contents',
        'curriculum_assignments'
      )
        AND c.name = 'id'
      ORDER BY t.name
    `);

    expect(defaultConstraintResult).toHaveLength(6);
    expect(defaultConstraintResult.every((row) => row.default_definition === null)).toBe(true);
  });

  it('includes source_locale and content_hash columns', async () => {
    const columns = await AppDataSource.query<Array<{ TABLE_NAME: string; COLUMN_NAME: string }>>(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE (TABLE_NAME = 'curriculums' AND COLUMN_NAME = 'source_locale')
         OR (TABLE_NAME = 'lesson_contents' AND COLUMN_NAME = 'content_hash')
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);

    expect(columns).toEqual([
      { TABLE_NAME: 'curriculums', COLUMN_NAME: 'source_locale' },
      { TABLE_NAME: 'lesson_contents', COLUMN_NAME: 'content_hash' },
    ]);
  });

  it('rejects duplicate curriculum code within same parish and level', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-dup`, 'Dup Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-dup`,
      'Level Dup',
      1,
    );

    await insertCurriculum(parishId, levelId, `${TEST_CODE_PREFIX}cur-dup`, 'Cur Dup', 'vi-VN');

    await expect(
      insertCurriculum(parishId, levelId, `${TEST_CODE_PREFIX}cur-dup`, 'Cur Dup 2', 'vi-VN'),
    ).rejects.toThrow();
  });

  it('allows same curriculum code for different catechism levels', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-level`, 'Level Parish');
    const levelOneId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-one`,
      'Level One',
      1,
    );
    const levelTwoId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-two`,
      'Level Two',
      2,
    );

    const sharedCode = `${TEST_CODE_PREFIX}shared-code`;

    await insertCurriculum(parishId, levelOneId, sharedCode, 'Cur One', 'vi-VN');
    await expect(
      insertCurriculum(parishId, levelTwoId, sharedCode, 'Cur Two', 'vi-VN'),
    ).resolves.toBeDefined();
  });

  it('persists sourceLocale and Unicode curriculum text', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-locale`, 'Locale Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-locale`,
      'Niveau Débutant',
      1,
    );

    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-locale`,
      'Giáo lý Khai Tâm — École',
      'fr-FR',
    );

    const rows = await AppDataSource.query<Array<{ source_locale: string; name: string }>>(
      `SELECT source_locale, name FROM curriculums WHERE id = @0`,
      [curriculumId],
    );

    expect(rows[0]?.source_locale).toBe('fr-FR');
    expect(rows[0]?.name).toBe('Giáo lý Khai Tâm — École');
  });

  it('enforces one DRAFT version per curriculum', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-draft`, 'Draft Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-draft`,
      'Draft Level',
      1,
    );
    const userId = await insertUser(`${TEST_CODE_PREFIX}draft-user@example.com`);
    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-draft`,
      'Draft Cur',
      'vi-VN',
    );

    await insertCurriculumVersion(curriculumId, 1, 'DRAFT', null, null, userId);

    await expect(
      insertCurriculumVersion(curriculumId, 2, 'DRAFT', null, null, userId),
    ).rejects.toThrow();
  });

  it('allows multiple PUBLISHED versions per curriculum', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-pub`, 'Pub Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-pub`,
      'Pub Level',
      1,
    );
    const userId = await insertUser(`${TEST_CODE_PREFIX}pub-user@example.com`);
    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-pub`,
      'Pub Cur',
      'vi-VN',
    );
    const publishedAt = new Date('2026-01-01T00:00:00.000Z');

    await insertCurriculumVersion(curriculumId, 1, 'PUBLISHED', publishedAt, userId, userId);
    await expect(
      insertCurriculumVersion(curriculumId, 2, 'ARCHIVED', publishedAt, userId, userId),
    ).resolves.toBeDefined();
  });

  it('allows same canonicalLessonKey across version-scoped lesson rows', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-canonical`, 'Canonical Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-canonical`,
      'Canonical Level',
      1,
    );
    const userId = await insertUser(`${TEST_CODE_PREFIX}canonical-user@example.com`);
    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-canonical`,
      'Canonical Cur',
      'vi-VN',
    );
    const versionOneId = await insertCurriculumVersion(
      curriculumId,
      1,
      'PUBLISHED',
      new Date('2026-01-01T00:00:00.000Z'),
      userId,
      userId,
    );
    const versionTwoId = await insertCurriculumVersion(
      curriculumId,
      2,
      'DRAFT',
      null,
      null,
      userId,
    );
    const topicOneId = await insertTopic(versionOneId, 'Topic V1', 0);
    const topicTwoId = await insertTopic(versionTwoId, 'Topic V2', 0);
    const sharedKey = generateUuidV4();

    await insertLesson(versionOneId, topicOneId, sharedKey, 'Lesson V1', 0);
    await expect(
      insertLesson(versionTwoId, topicTwoId, sharedKey, 'Lesson V2', 0),
    ).resolves.toBeDefined();
  });

  it('rejects invalid JSON content and accepts valid Unicode JSON', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-json`, 'Json Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-json`,
      'Json Level',
      1,
    );
    const userId = await insertUser(`${TEST_CODE_PREFIX}json-user@example.com`);
    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-json`,
      'Json Cur',
      'vi-VN',
    );
    const versionId = await insertCurriculumVersion(curriculumId, 1, 'DRAFT', null, null, userId);
    const topicId = await insertTopic(versionId, 'Chủ đề Thánh Thể', 0);
    const lessonId = await insertLesson(versionId, topicId, generateUuidV4(), 'Bài về Bí tích', 0);

    await expect(insertLessonContent(lessonId, 'not-json')).rejects.toThrow();

    const validJson = '{"schemaVersion":1,"blocks":[{"type":"paragraph","text":"Giáo lý — été"}]}';
    await expect(insertLessonContent(lessonId, validJson, 'abc123')).resolves.toBeDefined();

    const rows = await AppDataSource.query<Array<{ content_json: string; content_hash: string }>>(
      `SELECT content_json, content_hash FROM lesson_contents WHERE lesson_id = @0`,
      [lessonId],
    );

    expect(rows[0]?.content_json).toContain('Giáo lý — été');
    expect(rows[0]?.content_hash).toBe('abc123');
  });

  it('enforces one curriculum assignment per parish year level triple', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-assign`, 'Assign Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-assign`,
      'Assign Level',
      1,
    );
    const yearId = await insertAcademicYear(
      parishId,
      `${TEST_CODE_PREFIX}year-assign`,
      '2026-09-01',
      '2027-06-30',
    );
    const userId = await insertUser(`${TEST_CODE_PREFIX}assign-user@example.com`);
    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-assign`,
      'Assign Cur',
      'vi-VN',
    );
    const versionOneId = await insertCurriculumVersion(
      curriculumId,
      1,
      'PUBLISHED',
      new Date('2026-01-01T00:00:00.000Z'),
      userId,
      userId,
    );
    const versionTwoId = await insertCurriculumVersion(
      curriculumId,
      2,
      'PUBLISHED',
      new Date('2026-02-01T00:00:00.000Z'),
      userId,
      userId,
    );

    await insertCurriculumAssignment(parishId, yearId, levelId, versionOneId, userId);

    await expect(
      insertCurriculumAssignment(parishId, yearId, levelId, versionTwoId, userId),
    ).rejects.toThrow();
  });

  it('rejects negative topic sort order and invalid lesson duration', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}parish-check`, 'Check Parish');
    const levelId = await insertCatechismLevel(
      parishId,
      `${TEST_CODE_PREFIX}level-check`,
      'Check Level',
      1,
    );
    const userId = await insertUser(`${TEST_CODE_PREFIX}check-user@example.com`);
    const curriculumId = await insertCurriculum(
      parishId,
      levelId,
      `${TEST_CODE_PREFIX}cur-check`,
      'Check Cur',
      'vi-VN',
    );
    const versionId = await insertCurriculumVersion(curriculumId, 1, 'DRAFT', null, null, userId);

    await expect(insertTopic(versionId, 'Bad Topic', -1)).rejects.toThrow();

    const topicId = await insertTopic(versionId, 'Good Topic', 0);
    await expect(
      insertLesson(versionId, topicId, generateUuidV4(), 'Bad Lesson', 0, 0),
    ).rejects.toThrow();
  });
});
