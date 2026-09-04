import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'co002-';

interface TestClassContext {
  parishId: string;
  academicYearId: string;
  classId: string;
  enrollmentId: string;
  studentId: string;
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

async function insertTestClassContext(codeSuffix: string): Promise<TestClassContext> {
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
    [parishId, `${TEST_CODE_PREFIX}${codeSuffix}`, `Class Ops Parish ${codeSuffix}`],
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
      VALUES (@0, @1, @2, @3, @4, 'Class Ops Class', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [classId, parishId, academicYearId, catechismLevelId, `${TEST_CODE_PREFIX}${codeSuffix}-class`],
  );

  await AppDataSource.query(
    `
      INSERT INTO students (id, user_id, full_name, status, created_at, updated_at)
      VALUES (@0, NULL, @1, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [studentId, 'Class Ops Learner'],
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

  return { parishId, academicYearId, classId, enrollmentId, studentId, userId };
}

describe('Class operations foundation integration (MSSQL)', () => {
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
      DELETE FROM attendance_records
      WHERE session_id IN (
        SELECT id FROM class_sessions
        WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM class_session_roster
      WHERE session_id IN (
        SELECT id FROM class_sessions
        WHERE parish_id IN (
          SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
        )
      )
    `);

    await AppDataSource.query(`
      DELETE FROM class_sessions
      WHERE parish_id IN (
        SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM students
      WHERE full_name = N'Class Ops Learner'
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

  it('creates class_sessions, class_session_roster, and attendance_records tables', async () => {
    const tables = await AppDataSource.query<Array<{ table_name: string }>>(`
      SELECT t.name AS table_name
      FROM sys.tables t
      WHERE t.name IN ('class_sessions', 'class_session_roster', 'attendance_records')
      ORDER BY t.name
    `);

    expect(tables.map((row) => row.table_name)).toEqual([
      'attendance_records',
      'class_session_roster',
      'class_sessions',
    ]);
  });

  it('stores class_sessions primary keys without database-generated UUID defaults', async () => {
    const defaultConstraintResult = await AppDataSource.query<
      Array<{ column_name: string; default_definition: string | null }>
    >(`
      SELECT
        c.name AS column_name,
        dc.definition AS default_definition
      FROM sys.columns c
      INNER JOIN sys.tables t ON t.object_id = c.object_id
      LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
      WHERE t.name = 'class_sessions'
        AND c.name = 'id'
    `);

    expect(defaultConstraintResult[0]?.default_definition ?? null).toBeNull();
  });

  it('creates a SCHEDULED class session with valid times', async () => {
    const context = await insertTestClassContext('create-session');
    const sessionId = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO class_sessions (
          id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
          cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
        )
        VALUES (
          @0, @1, @2, @3, N'Week 1', DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 2, GETUTCDATE()),
          'SCHEDULED', NULL, NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [sessionId, context.classId, context.parishId, context.academicYearId, context.userId],
    );

    const rows = await AppDataSource.query<Array<{ status: string }>>(
      `SELECT status FROM class_sessions WHERE id = @0`,
      [sessionId],
    );

    expect(rows[0]?.status).toBe('SCHEDULED');
  });

  it('rejects endsAt <= startsAt', async () => {
    const context = await insertTestClassContext('bad-time');
    const sessionId = generateUuidV4();

    await expect(
      AppDataSource.query(
        `
          INSERT INTO class_sessions (
            id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
            cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
          )
          VALUES (
            @0, @1, @2, @3, NULL, DATEADD(hour, 2, GETUTCDATE()), DATEADD(hour, 1, GETUTCDATE()),
            'SCHEDULED', NULL, NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
          )
        `,
        [sessionId, context.classId, context.parishId, context.academicYearId, context.userId],
      ),
    ).rejects.toThrow();
  });

  it('rejects invalid session status', async () => {
    const context = await insertTestClassContext('bad-status');
    const sessionId = generateUuidV4();

    await expect(
      AppDataSource.query(
        `
          INSERT INTO class_sessions (
            id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
            cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
          )
          VALUES (
            @0, @1, @2, @3, NULL, DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 2, GETUTCDATE()),
            'DRAFT', NULL, NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
          )
        `,
        [sessionId, context.classId, context.parishId, context.academicYearId, context.userId],
      ),
    ).rejects.toThrow();
  });

  it('creates roster rows and rejects duplicate roster identity', async () => {
    const context = await insertTestClassContext('roster');
    const sessionId = generateUuidV4();
    const rosterId = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO class_sessions (
          id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
          cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
        )
        VALUES (
          @0, @1, @2, @3, NULL, DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 2, GETUTCDATE()),
          'SCHEDULED', NULL, NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [sessionId, context.classId, context.parishId, context.academicYearId, context.userId],
    );

    await AppDataSource.query(
      `
        INSERT INTO class_session_roster (
          id, session_id, enrollment_id, student_id, display_name_snapshot, created_at
        )
        VALUES (@0, @1, @2, @3, N'Class Ops Learner', GETUTCDATE())
      `,
      [rosterId, sessionId, context.enrollmentId, context.studentId],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO class_session_roster (
            id, session_id, enrollment_id, student_id, display_name_snapshot, created_at
          )
          VALUES (@0, @1, @2, @3, N'Duplicate', GETUTCDATE())
        `,
        [generateUuidV4(), sessionId, context.enrollmentId, context.studentId],
      ),
    ).rejects.toThrow();
  });

  it('creates attendance and rejects duplicate attendance identity and invalid status', async () => {
    const context = await insertTestClassContext('attendance');
    const sessionId = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO class_sessions (
          id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
          cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
        )
        VALUES (
          @0, @1, @2, @3, NULL, DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 2, GETUTCDATE()),
          'SCHEDULED', NULL, NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [sessionId, context.classId, context.parishId, context.academicYearId, context.userId],
    );

    await AppDataSource.query(
      `
        INSERT INTO class_session_roster (
          id, session_id, enrollment_id, student_id, display_name_snapshot, created_at
        )
        VALUES (@0, @1, @2, @3, N'Class Ops Learner', GETUTCDATE())
      `,
      [generateUuidV4(), sessionId, context.enrollmentId, context.studentId],
    );

    await AppDataSource.query(
      `
        INSERT INTO attendance_records (
          id, session_id, enrollment_id, student_id, status, note, marked_by_user_id, marked_at,
          updated_by_user_id, created_at, updated_at
        )
        VALUES (
          @0, @1, @2, @3, 'PRESENT', NULL, @4, GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [generateUuidV4(), sessionId, context.enrollmentId, context.studentId, context.userId],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO attendance_records (
            id, session_id, enrollment_id, student_id, status, note, marked_by_user_id, marked_at,
            updated_by_user_id, created_at, updated_at
          )
          VALUES (
            @0, @1, @2, @3, 'ABSENT', NULL, @4, GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE()
          )
        `,
        [generateUuidV4(), sessionId, context.enrollmentId, context.studentId, context.userId],
      ),
    ).rejects.toThrow();

    await AppDataSource.query(`DELETE FROM attendance_records WHERE session_id = @0`, [sessionId]);

    await expect(
      AppDataSource.query(
        `
          INSERT INTO attendance_records (
            id, session_id, enrollment_id, student_id, status, note, marked_by_user_id, marked_at,
            updated_by_user_id, created_at, updated_at
          )
          VALUES (
            @0, @1, @2, @3, 'UNMARKED', NULL, @4, GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE()
          )
        `,
        [generateUuidV4(), sessionId, context.enrollmentId, context.studentId, context.userId],
      ),
    ).rejects.toThrow();
  });

  it('keeps historical attendance when parent class cannot be deleted (NO ACTION FK)', async () => {
    const context = await insertTestClassContext('fk-safe');
    const sessionId = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO class_sessions (
          id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
          cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
        )
        VALUES (
          @0, @1, @2, @3, NULL, DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 2, GETUTCDATE()),
          'SCHEDULED', NULL, NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [sessionId, context.classId, context.parishId, context.academicYearId, context.userId],
    );

    await expect(
      AppDataSource.query(`DELETE FROM classes WHERE id = @0`, [context.classId]),
    ).rejects.toThrow();
  });

  it('enforces COMPLETED requires completed_at and CANCELLED requires cancelled_at', async () => {
    const context = await insertTestClassContext('lifecycle-ts');
    const sessionId = generateUuidV4();

    await expect(
      AppDataSource.query(
        `
          INSERT INTO class_sessions (
            id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
            cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
          )
          VALUES (
            @0, @1, @2, @3, NULL, DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 2, GETUTCDATE()),
            'COMPLETED', NULL, NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
          )
        `,
        [sessionId, context.classId, context.parishId, context.academicYearId, context.userId],
      ),
    ).rejects.toThrow();

    await AppDataSource.query(
      `
        INSERT INTO class_sessions (
          id, class_id, parish_id, academic_year_id, title, starts_at, ends_at, status,
          cancelled_at, completed_at, created_by_user_id, updated_by_user_id, created_at, updated_at
        )
        VALUES (
          @0, @1, @2, @3, NULL, DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 2, GETUTCDATE()),
          'CANCELLED', GETUTCDATE(), NULL, @4, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [generateUuidV4(), context.classId, context.parishId, context.academicYearId, context.userId],
    );
  });

  it('documents FK delete_referential_action as NO_ACTION for class_sessions.class_id', async () => {
    const foreignKeys = await AppDataSource.query<
      Array<{ fk_name: string; delete_referential_action_desc: string }>
    >(`
      SELECT
        fk.name AS fk_name,
        fk.delete_referential_action_desc
      FROM sys.foreign_keys fk
      INNER JOIN sys.tables t ON t.object_id = fk.parent_object_id
      WHERE t.name = 'class_sessions'
        AND fk.name = 'FK_class_sessions_class_id_classes_id'
    `);

    expect(foreignKeys[0]?.delete_referential_action_desc).toBe('NO_ACTION');
  });
});
