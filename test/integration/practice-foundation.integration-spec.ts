import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'pr002-';

interface TestEnrollmentContext {
  parishId: string;
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
    [parishId, `${TEST_CODE_PREFIX}${codeSuffix}`, `Practice Parish ${codeSuffix}`],
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
      VALUES (@0, @1, @2, @3, @4, 'Practice Class', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [classId, parishId, academicYearId, catechismLevelId, `${TEST_CODE_PREFIX}${codeSuffix}-class`],
  );

  await AppDataSource.query(
    `
      INSERT INTO students (id, user_id, full_name, status, created_at, updated_at)
      VALUES (@0, NULL, @1, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [studentId, 'Học viên thử nghiệm'],
  );

  await AppDataSource.query(
    `
      INSERT INTO enrollments (
        id, student_id, class_id, parish_id, academic_year_id, status, enrolled_at, left_at, created_at, updated_at
      )
      VALUES (@0, @1, @2, @3, @4, 'ACTIVE', GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE())
    `,
    [enrollmentId, studentId, classId, parishId, academicYearId],
  );

  return { parishId, enrollmentId, userId };
}

interface InsertPracticeSessionInput {
  id?: string;
  enrollmentId: string;
  sessionType?: string;
  sourceSessionId?: string | null;
  status?: string;
  locale?: string;
  curriculumId?: string | null;
  canonicalLessonKey?: string | null;
  requestedQuestionCount?: number;
  maxAttemptsPerQuestion?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  clientRequestId?: string | null;
  createdByUserId: string;
  startedAt?: Date;
  completedAt?: Date | null;
  abandonedAt?: Date | null;
}

async function insertPracticeSession(input: InsertPracticeSessionInput): Promise<string> {
  const id = input.id ?? generateUuidV4();
  const startedAt = input.startedAt ?? new Date('2026-08-31T00:00:00.000Z');

  await AppDataSource.query(
    `
      INSERT INTO practice_sessions (
        id,
        enrollment_id,
        session_type,
        source_session_id,
        status,
        locale,
        curriculum_id,
        canonical_lesson_key,
        requested_question_count,
        max_attempts_per_question,
        randomize_questions,
        randomize_options,
        client_request_id,
        created_by_user_id,
        started_at,
        completed_at,
        abandoned_at,
        created_at,
        updated_at
      )
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, @12, @13, @14, @15, @16,
        GETUTCDATE(), GETUTCDATE()
      )
    `,
    [
      id,
      input.enrollmentId,
      input.sessionType ?? 'STANDARD',
      input.sourceSessionId ?? null,
      input.status ?? 'IN_PROGRESS',
      input.locale ?? 'vi-VN',
      input.curriculumId ?? null,
      input.canonicalLessonKey ?? null,
      input.requestedQuestionCount ?? 5,
      input.maxAttemptsPerQuestion ?? 3,
      input.randomizeQuestions ?? true,
      input.randomizeOptions ?? true,
      input.clientRequestId ?? null,
      input.createdByUserId,
      startedAt,
      input.completedAt ?? null,
      input.abandonedAt ?? null,
    ],
  );

  return id;
}

async function insertPracticeSessionQuestion(input: {
  practiceSessionId: string;
  questionVersionId: string;
  position: number;
  deliveredOptionOrderJson?: string | null;
  id?: string;
}): Promise<string> {
  const id = input.id ?? generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO practice_session_questions (
        id, practice_session_id, question_version_id, position, delivered_option_order_json, created_at
      )
      VALUES (@0, @1, @2, @3, @4, GETUTCDATE())
    `,
    [
      id,
      input.practiceSessionId,
      input.questionVersionId,
      input.position,
      input.deliveredOptionOrderJson ?? null,
    ],
  );

  return id;
}

async function insertPracticeAnswerAttempt(input: {
  practiceSessionQuestionId: string;
  attemptNumber: number;
  clientAnswerId: string;
  selectedOptionIdsJson: string;
  isCorrect: boolean;
  score: number;
  submittedByUserId: string;
  submittedAt?: Date;
  id?: string;
}): Promise<string> {
  const id = input.id ?? generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO practice_answer_attempts (
        id,
        practice_session_question_id,
        attempt_number,
        client_answer_id,
        selected_option_ids_json,
        is_correct,
        score,
        submitted_by_user_id,
        submitted_at
      )
      VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8)
    `,
    [
      id,
      input.practiceSessionQuestionId,
      input.attemptNumber,
      input.clientAnswerId,
      input.selectedOptionIdsJson,
      input.isCorrect,
      input.score,
      input.submittedByUserId,
      input.submittedAt ?? new Date('2026-08-31T01:00:00.000Z'),
    ],
  );

  return id;
}

describe('Practice foundation integration (MSSQL)', () => {
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
      DELETE FROM practice_sessions
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
      WHERE full_name = N'Học viên thử nghiệm'
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

  it('creates practice foundation tables', async () => {
    const tables = await AppDataSource.query<Array<{ table_name: string }>>(`
      SELECT t.name AS table_name
      FROM sys.tables t
      WHERE t.name IN (
        'practice_sessions',
        'practice_session_questions',
        'practice_answer_attempts'
      )
      ORDER BY t.name
    `);

    expect(tables.map((row) => row.table_name)).toEqual([
      'practice_answer_attempts',
      'practice_session_questions',
      'practice_sessions',
    ]);
  });

  it('stores practice primary keys without database-generated UUID defaults', async () => {
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
        'practice_sessions',
        'practice_session_questions',
        'practice_answer_attempts'
      )
        AND c.name = 'id'
      ORDER BY t.name
    `);

    expect(defaultConstraintResult).toHaveLength(3);
    expect(defaultConstraintResult.every((row) => row.default_definition === null)).toBe(true);
  });

  it('does not create foreign keys to question_versions or curriculums', async () => {
    const foreignKeys = await AppDataSource.query<
      Array<{ fk_name: string; referenced_table: string }>
    >(
      `
        SELECT fk.name AS fk_name, rt.name AS referenced_table
        FROM sys.foreign_keys fk
        INNER JOIN sys.tables rt
          ON rt.object_id = fk.referenced_object_id
        WHERE fk.parent_object_id IN (
          OBJECT_ID('practice_sessions'),
          OBJECT_ID('practice_session_questions'),
          OBJECT_ID('practice_answer_attempts')
        )
      `,
    );

    const referencedTables = foreignKeys.map((row) => row.referenced_table);

    expect(referencedTables).not.toContain('question_versions');
    expect(referencedTables).not.toContain('curriculums');
    expect(referencedTables).toEqual(
      expect.arrayContaining([
        'enrollments',
        'users',
        'practice_sessions',
        'practice_session_questions',
      ]),
    );
  });

  it('enforces enrollment and user actor foreign keys', async () => {
    const context = await insertTestEnrollmentContext('fk');

    await expect(
      insertPracticeSession({
        enrollmentId: generateUuidV4(),
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        createdByUserId: generateUuidV4(),
      }),
    ).rejects.toThrow();
  });

  it('enforces STANDARD sourceSession null and REVIEW_WRONG requires source', async () => {
    const context = await insertTestEnrollmentContext('type');

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        sessionType: 'STANDARD',
        sourceSessionId: generateUuidV4(),
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        sessionType: 'REVIEW_WRONG',
        sourceSessionId: null,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();
  });

  it('denies self-referencing source_session_id', async () => {
    const context = await insertTestEnrollmentContext('self');
    const sessionId = generateUuidV4();

    await expect(
      insertPracticeSession({
        id: sessionId,
        enrollmentId: context.enrollmentId,
        sessionType: 'REVIEW_WRONG',
        sourceSessionId: sessionId,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();
  });

  it('enforces lifecycle timestamp consistency by status', async () => {
    const context = await insertTestEnrollmentContext('lifecycle');

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        status: 'IN_PROGRESS',
        completedAt: new Date('2026-08-31T02:00:00.000Z'),
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        status: 'COMPLETED',
        completedAt: null,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        status: 'ABANDONED',
        abandonedAt: null,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();
  });

  it('enforces requestedQuestionCount and maxAttemptsPerQuestion bounds', async () => {
    const context = await insertTestEnrollmentContext('bounds');

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        requestedQuestionCount: 0,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        requestedQuestionCount: 51,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        maxAttemptsPerQuestion: 0,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        maxAttemptsPerQuestion: 11,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();
  });

  it('enforces session clientRequestId idempotency per enrollment', async () => {
    const context = await insertTestEnrollmentContext('idempotent');
    const clientRequestId = generateUuidV4();

    await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      clientRequestId,
      createdByUserId: context.userId,
    });

    await expect(
      insertPracticeSession({
        enrollmentId: context.enrollmentId,
        clientRequestId,
        createdByUserId: context.userId,
      }),
    ).rejects.toThrow();
  });

  it('enforces session question position and questionVersion uniqueness', async () => {
    const context = await insertTestEnrollmentContext('question');
    const sessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      createdByUserId: context.userId,
    });
    const questionVersionId = generateUuidV4();

    await insertPracticeSessionQuestion({
      practiceSessionId: sessionId,
      questionVersionId,
      position: 1,
    });

    await expect(
      insertPracticeSessionQuestion({
        practiceSessionId: sessionId,
        questionVersionId,
        position: 2,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSessionQuestion({
        practiceSessionId: sessionId,
        questionVersionId: generateUuidV4(),
        position: 1,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeSessionQuestion({
        practiceSessionId: sessionId,
        questionVersionId: generateUuidV4(),
        position: 0,
      }),
    ).rejects.toThrow();
  });

  it('validates delivered option order JSON and accepts valid JSON', async () => {
    const context = await insertTestEnrollmentContext('option-json');
    const sessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      createdByUserId: context.userId,
    });

    await expect(
      insertPracticeSessionQuestion({
        practiceSessionId: sessionId,
        questionVersionId: generateUuidV4(),
        position: 1,
        deliveredOptionOrderJson: 'not-json',
      }),
    ).rejects.toThrow();

    const optionId = generateUuidV4();
    const sessionQuestionId = await insertPracticeSessionQuestion({
      practiceSessionId: sessionId,
      questionVersionId: generateUuidV4(),
      position: 1,
      deliveredOptionOrderJson: JSON.stringify([optionId]),
    });

    const rows = await AppDataSource.query<Array<{ delivered_option_order_json: string }>>(
      `SELECT delivered_option_order_json FROM practice_session_questions WHERE id = @0`,
      [sessionQuestionId],
    );

    expect(JSON.parse(rows[0]?.delivered_option_order_json ?? '[]')).toEqual([optionId]);
  });

  it('enforces attempt number, clientAnswerId uniqueness, score bounds, and JSON payload', async () => {
    const context = await insertTestEnrollmentContext('attempt');
    const sessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      createdByUserId: context.userId,
    });
    const sessionQuestionId = await insertPracticeSessionQuestion({
      practiceSessionId: sessionId,
      questionVersionId: generateUuidV4(),
      position: 1,
    });
    const clientAnswerId = generateUuidV4();
    const optionId = generateUuidV4();

    await insertPracticeAnswerAttempt({
      practiceSessionQuestionId: sessionQuestionId,
      attemptNumber: 1,
      clientAnswerId,
      selectedOptionIdsJson: JSON.stringify([optionId]),
      isCorrect: false,
      score: 0,
      submittedByUserId: context.userId,
    });

    await expect(
      insertPracticeAnswerAttempt({
        practiceSessionQuestionId: sessionQuestionId,
        attemptNumber: 1,
        clientAnswerId: generateUuidV4(),
        selectedOptionIdsJson: JSON.stringify([optionId]),
        isCorrect: true,
        score: 1,
        submittedByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeAnswerAttempt({
        practiceSessionQuestionId: sessionQuestionId,
        attemptNumber: 2,
        clientAnswerId: clientAnswerId,
        selectedOptionIdsJson: JSON.stringify([optionId]),
        isCorrect: true,
        score: 1,
        submittedByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeAnswerAttempt({
        practiceSessionQuestionId: sessionQuestionId,
        attemptNumber: 2,
        clientAnswerId: generateUuidV4(),
        selectedOptionIdsJson: 'not-json',
        isCorrect: false,
        score: 0,
        submittedByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeAnswerAttempt({
        practiceSessionQuestionId: sessionQuestionId,
        attemptNumber: 2,
        clientAnswerId: generateUuidV4(),
        selectedOptionIdsJson: JSON.stringify([optionId]),
        isCorrect: false,
        score: 2,
        submittedByUserId: context.userId,
      }),
    ).rejects.toThrow();

    await expect(
      insertPracticeAnswerAttempt({
        practiceSessionQuestionId: sessionQuestionId,
        attemptNumber: 0,
        clientAnswerId: generateUuidV4(),
        selectedOptionIdsJson: JSON.stringify([optionId]),
        isCorrect: false,
        score: 0,
        submittedByUserId: context.userId,
      }),
    ).rejects.toThrow();
  });

  it('cascades owned session questions and attempts when session is deleted', async () => {
    const context = await insertTestEnrollmentContext('cascade');
    const sessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      createdByUserId: context.userId,
    });
    const sessionQuestionId = await insertPracticeSessionQuestion({
      practiceSessionId: sessionId,
      questionVersionId: generateUuidV4(),
      position: 1,
    });

    await insertPracticeAnswerAttempt({
      practiceSessionQuestionId: sessionQuestionId,
      attemptNumber: 1,
      clientAnswerId: generateUuidV4(),
      selectedOptionIdsJson: JSON.stringify([generateUuidV4()]),
      isCorrect: true,
      score: 1,
      submittedByUserId: context.userId,
    });

    await AppDataSource.query(`DELETE FROM practice_sessions WHERE id = @0`, [sessionId]);

    const questionRows = await AppDataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM practice_session_questions WHERE practice_session_id = @0`,
      [sessionId],
    );
    const attemptRows = await AppDataSource.query<Array<{ count: number }>>(
      `
        SELECT COUNT(*) AS count
        FROM practice_answer_attempts
        WHERE practice_session_question_id = @0
      `,
      [sessionQuestionId],
    );

    expect(Number(questionRows[0]?.count)).toBe(0);
    expect(Number(attemptRows[0]?.count)).toBe(0);
  });

  it('blocks deleting source session when review child references it', async () => {
    const context = await insertTestEnrollmentContext('source-no-action');
    const sourceSessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      status: 'COMPLETED',
      completedAt: new Date('2026-08-31T03:00:00.000Z'),
      createdByUserId: context.userId,
    });

    await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      sessionType: 'REVIEW_WRONG',
      sourceSessionId,
      createdByUserId: context.userId,
    });

    await expect(
      AppDataSource.query(`DELETE FROM practice_sessions WHERE id = @0`, [sourceSessionId]),
    ).rejects.toThrow();
  });

  it('allows review-wrong lineage chain STANDARD -> child -> grandchild', async () => {
    const context = await insertTestEnrollmentContext('lineage');
    const standardSessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      status: 'COMPLETED',
      completedAt: new Date('2026-08-31T04:00:00.000Z'),
      createdByUserId: context.userId,
    });
    const reviewSessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      sessionType: 'REVIEW_WRONG',
      sourceSessionId: standardSessionId,
      status: 'COMPLETED',
      completedAt: new Date('2026-08-31T05:00:00.000Z'),
      createdByUserId: context.userId,
    });
    const grandchildSessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      sessionType: 'REVIEW_WRONG',
      sourceSessionId: reviewSessionId,
      createdByUserId: context.userId,
    });

    const rows = await AppDataSource.query<
      Array<{ session_type: string; source_session_id: string }>
    >(
      `
        SELECT session_type, source_session_id
        FROM practice_sessions
        WHERE id = @0
      `,
      [grandchildSessionId],
    );

    expect(rows[0]?.session_type).toBe('REVIEW_WRONG');
    expect(rows[0]?.source_session_id?.toLowerCase()).toBe(reviewSessionId.toLowerCase());
  });

  it('persists Unicode locale values', async () => {
    const context = await insertTestEnrollmentContext('locale');
    const sessionId = await insertPracticeSession({
      enrollmentId: context.enrollmentId,
      locale: 'fr-FR',
      createdByUserId: context.userId,
    });

    const rows = await AppDataSource.query<Array<{ locale: string }>>(
      `SELECT locale FROM practice_sessions WHERE id = @0`,
      [sessionId],
    );

    expect(rows[0]?.locale).toBe('fr-FR');
  });
});
