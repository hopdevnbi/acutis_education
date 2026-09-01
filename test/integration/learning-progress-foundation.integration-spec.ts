import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'lp002-';

interface TestEnrollmentContext {
  enrollmentId: string;
  userId: string;
}

async function insertUser(email: string): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO users (id, email, password_hash, status, created_at, updated_at)
      VALUES (@0, @1, @2, @3, GETUTCDATE(), GETUTCDATE())
    `,
    [id, email, 'test-hash', 'ACTIVE'],
  );

  return id;
}

async function insertTestEnrollmentContext(codeSuffix: string): Promise<TestEnrollmentContext> {
  const parishId = generateUuidV4();
  const academicYearId = generateUuidV4();
  const catechismLevelId = generateUuidV4();
  const classId = generateUuidV4();
  const studentId = generateUuidV4();
  const enrollmentId = generateUuidV4();
  const userId = await insertUser(`${TEST_CODE_PREFIX}${codeSuffix}@example.com`);

  await AppDataSource.query(
    `
      INSERT INTO parishes (id, code, name, status, created_at, updated_at)
      VALUES (@0, @1, @2, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [parishId, `${TEST_CODE_PREFIX}${codeSuffix}`, `Learning Progress Parish ${codeSuffix}`],
  );

  await AppDataSource.query(
    `
      INSERT INTO academic_years (
        id, parish_id, name, start_date, end_date, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, '2026-09-01', '2027-06-30', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [academicYearId, parishId, `${TEST_CODE_PREFIX}${codeSuffix}-year`],
  );

  await AppDataSource.query(
    `
      INSERT INTO catechism_levels (
        id, parish_id, code, name, sort_order, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, 'Level One', 1, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [catechismLevelId, parishId, `${TEST_CODE_PREFIX}${codeSuffix}-level`],
  );

  await AppDataSource.query(
    `
      INSERT INTO classes (
        id, parish_id, academic_year_id, catechism_level_id, code, name, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, @3, @4, 'Learning Progress Class', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [classId, parishId, academicYearId, catechismLevelId, `${TEST_CODE_PREFIX}${codeSuffix}-class`],
  );

  await AppDataSource.query(
    `
      INSERT INTO students (id, user_id, full_name, status, created_at, updated_at)
      VALUES (@0, NULL, @1, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [studentId, 'Demo learner'],
  );

  await AppDataSource.query(
    `
      INSERT INTO enrollments (
        id, student_id, class_id, parish_id, academic_year_id, status, enrolled_at, created_at, updated_at
      )
      VALUES (@0, @1, @2, @3, @4, 'ACTIVE', GETUTCDATE(), GETUTCDATE(), GETUTCDATE())
    `,
    [enrollmentId, studentId, classId, parishId, academicYearId],
  );

  return { enrollmentId, userId };
}

describe('Learning progress foundation integration (MSSQL)', () => {
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
      DELETE FROM lesson_progress
      WHERE enrollment_id IN (
        SELECT id FROM enrollments
        WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM students
      WHERE full_name = N'Demo learner'
        AND NOT EXISTS (
          SELECT 1 FROM enrollments e WHERE e.student_id = students.id
        )
    `);

    await AppDataSource.query(`
      DELETE FROM classes
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM catechism_levels
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM users
      WHERE email LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
  });

  it('creates lesson_progress table', async () => {
    const tables = await AppDataSource.query<Array<{ table_name: string }>>(`
      SELECT t.name AS table_name
      FROM sys.tables t
      WHERE t.name = 'lesson_progress'
    `);

    expect(tables.map((row) => row.table_name)).toEqual(['lesson_progress']);
  });

  it('stores lesson_progress primary keys without database-generated UUID defaults', async () => {
    const defaultConstraintResult = await AppDataSource.query<
      Array<{ column_name: string; default_definition: string | null }>
    >(`
      SELECT
        c.name AS column_name,
        dc.definition AS default_definition
      FROM sys.columns c
      INNER JOIN sys.tables t ON t.object_id = c.object_id
      LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
      WHERE t.name = 'lesson_progress'
        AND c.name = 'id'
    `);

    expect(defaultConstraintResult[0]?.default_definition ?? null).toBeNull();
  });

  it('enforces enrollment and actor foreign keys without curriculum foreign keys', async () => {
    const foreignKeys = await AppDataSource.query<
      Array<{ fk_name: string; referenced_table: string }>
    >(
      `
        SELECT
          fk.name AS fk_name,
          rt.name AS referenced_table
        FROM sys.foreign_keys fk
        INNER JOIN sys.tables t ON t.object_id = fk.parent_object_id
        INNER JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id
        WHERE t.name = 'lesson_progress'
        ORDER BY fk.name
      `,
    );

    expect(foreignKeys.map((row) => row.referenced_table).sort()).toEqual([
      'enrollments',
      'users',
      'users',
    ]);
  });

  it('enforces unique enrollment curriculum lesson identity and status timestamps', async () => {
    const context = await insertTestEnrollmentContext('constraints');
    const curriculumId = generateUuidV4();
    const canonicalLessonKey = generateUuidV4();
    const versionId = generateUuidV4();
    const progressId = generateUuidV4();
    const startedAt = new Date('2026-09-01T08:00:00.000Z');

    await AppDataSource.query(
      `
        INSERT INTO lesson_progress (
          id, enrollment_id, curriculum_id, canonical_lesson_key, assigned_curriculum_version_id,
          status, started_at, started_by_user_id, completed_at, completed_by_user_id,
          created_at, updated_at
        )
        VALUES (@0, @1, @2, @3, @4, 'IN_PROGRESS', @5, @6, NULL, NULL, GETUTCDATE(), GETUTCDATE())
      `,
      [
        progressId,
        context.enrollmentId,
        curriculumId,
        canonicalLessonKey,
        versionId,
        startedAt,
        context.userId,
      ],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO lesson_progress (
            id, enrollment_id, curriculum_id, canonical_lesson_key, assigned_curriculum_version_id,
            status, started_at, started_by_user_id, completed_at, completed_by_user_id,
            created_at, updated_at
          )
          VALUES (@0, @1, @2, @3, @4, 'IN_PROGRESS', @5, @6, NULL, NULL, GETUTCDATE(), GETUTCDATE())
        `,
        [
          generateUuidV4(),
          context.enrollmentId,
          curriculumId,
          canonicalLessonKey,
          versionId,
          startedAt,
          context.userId,
        ],
      ),
    ).rejects.toThrow();

    await expect(
      AppDataSource.query(
        `
          INSERT INTO lesson_progress (
            id, enrollment_id, curriculum_id, canonical_lesson_key, assigned_curriculum_version_id,
            status, started_at, started_by_user_id, completed_at, completed_by_user_id,
            created_at, updated_at
          )
          VALUES (@0, @1, @2, @3, @4, 'COMPLETED', @5, @6, NULL, @7, GETUTCDATE(), GETUTCDATE())
        `,
        [
          generateUuidV4(),
          context.enrollmentId,
          curriculumId,
          generateUuidV4(),
          versionId,
          startedAt,
          context.userId,
          context.userId,
        ],
      ),
    ).rejects.toThrow();
  });
});
