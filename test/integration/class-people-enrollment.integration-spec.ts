import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'cls002-';
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

async function insertStudent(fullName: string, userId: string | null = null): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO students (id, user_id, full_name, status)
      VALUES (@0, @1, @2, @3)
    `,
    [id, userId, fullName, 'ACTIVE'],
  );

  return id;
}

async function insertClass(
  parishId: string,
  academicYearId: string,
  catechismLevelId: string,
  code: string,
  name: string,
): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO classes (id, parish_id, academic_year_id, catechism_level_id, code, name, status)
      VALUES (@0, @1, @2, @3, @4, @5, @6)
    `,
    [id, parishId, academicYearId, catechismLevelId, code, name, 'PLANNED'],
  );

  return id;
}

describe('Class people enrollment integration (MSSQL)', () => {
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
      DELETE FROM enrollments
      WHERE student_id IN (
        SELECT id FROM students WHERE full_name LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (
        SELECT id FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM classes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE student_id IN (
        SELECT id FROM students WHERE full_name LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM students WHERE full_name LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%'
      )
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

  it('creates required class people enrollment tables', async () => {
    const tables = await AppDataSource.query<Array<{ TABLE_NAME: string }>>(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME IN (
          'parish_memberships',
          'students',
          'student_guardians',
          'classes',
          'class_catechist_assignments',
          'enrollments'
        )
      ORDER BY TABLE_NAME
    `);

    expect(tables.map((row) => row.TABLE_NAME)).toEqual([
      'class_catechist_assignments',
      'classes',
      'enrollments',
      'parish_memberships',
      'student_guardians',
      'students',
    ]);
  });

  it('stores new primary key ids without database-generated UUID defaults', async () => {
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
          'parish_memberships',
          'students',
          'student_guardians',
          'classes',
          'class_catechist_assignments',
          'enrollments'
        )
        AND c.name = 'id'
      ORDER BY t.name
    `);

    expect(defaultConstraintResult).toHaveLength(6);
    expect(defaultConstraintResult.every((row) => row.default_definition === null)).toBe(true);
  });

  describe('students', () => {
    it('allows multiple students with null user_id', async () => {
      await insertStudent(`${TEST_CODE_PREFIX}student-a`, null);
      await insertStudent(`${TEST_CODE_PREFIX}student-b`, null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(`
        SELECT COUNT(*) AS count
        FROM students
        WHERE full_name LIKE '${TEST_CODE_PREFIX}%'
          AND user_id IS NULL
      `);

      expect(rows[0]?.count).toBe(2);
    });

    it('rejects duplicate non-null user_id on students', async () => {
      const userId = await insertUser(`${TEST_CODE_PREFIX}linked-user@local.test`);
      await insertStudent(`${TEST_CODE_PREFIX}linked-student-a`, userId);

      await expect(insertStudent(`${TEST_CODE_PREFIX}linked-student-b`, userId)).rejects.toThrow();
    });

    it('rejects invalid user_id foreign key on students', async () => {
      await expect(
        insertStudent(`${TEST_CODE_PREFIX}invalid-user-student`, generateUuidV4()),
      ).rejects.toThrow();
    });

    it('persists Vietnamese full_name in nvarchar column', async () => {
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}Nguyễn Văn An`, null);

      const rows = await AppDataSource.query<Array<{ full_name: string }>>(
        `SELECT full_name FROM students WHERE id = @0`,
        [studentId],
      );

      expect(rows[0]?.full_name).toBe(`${TEST_CODE_PREFIX}Nguyễn Văn An`);
    });
  });

  describe('student_guardians', () => {
    async function insertGuardianLink(
      studentId: string,
      guardianUserId: string,
      status: 'ACTIVE' | 'ENDED',
      isPrimary: boolean,
      endsAt: Date | null,
    ): Promise<string> {
      const id = generateUuidV4();
      const startsAt = new Date('2026-09-01T00:00:00.000Z');

      await AppDataSource.query(
        `
          INSERT INTO student_guardians (
            id, student_id, guardian_user_id, relationship_type, is_primary, status, starts_at, ends_at
          )
          VALUES (@0, @1, @2, @3, @4, @5, @6, @7)
        `,
        [id, studentId, guardianUserId, 'PARENT', isPrimary ? 1 : 0, status, startsAt, endsAt],
      );

      return id;
    }

    it('rejects duplicate ACTIVE guardian pair for same student', async () => {
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}guardian-student`, null);
      const guardianUserId = await insertUser(`${TEST_CODE_PREFIX}guardian-a@local.test`);

      await insertGuardianLink(studentId, guardianUserId, 'ACTIVE', false, null);

      await expect(
        insertGuardianLink(studentId, guardianUserId, 'ACTIVE', false, null),
      ).rejects.toThrow();
    });

    it('allows ENDED historical row and new ACTIVE row for same pair', async () => {
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}guardian-history`, null);
      const guardianUserId = await insertUser(`${TEST_CODE_PREFIX}guardian-history@local.test`);
      const endedAt = new Date('2026-12-31T00:00:00.000Z');

      await insertGuardianLink(studentId, guardianUserId, 'ENDED', false, endedAt);
      await insertGuardianLink(studentId, guardianUserId, 'ACTIVE', false, null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM student_guardians
          WHERE student_id = @0 AND guardian_user_id = @1
        `,
        [studentId, guardianUserId],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('allows two ACTIVE guardians for one student', async () => {
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}multi-guardian-student`, null);
      const firstGuardianId = await insertUser(`${TEST_CODE_PREFIX}guardian-1@local.test`);
      const secondGuardianId = await insertUser(`${TEST_CODE_PREFIX}guardian-2@local.test`);

      await insertGuardianLink(studentId, firstGuardianId, 'ACTIVE', true, null);
      await insertGuardianLink(studentId, secondGuardianId, 'ACTIVE', false, null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM student_guardians
          WHERE student_id = @0 AND status = 'ACTIVE'
        `,
        [studentId],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('rejects two ACTIVE primary guardians for one student', async () => {
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}primary-student`, null);
      const firstGuardianId = await insertUser(`${TEST_CODE_PREFIX}primary-1@local.test`);
      const secondGuardianId = await insertUser(`${TEST_CODE_PREFIX}primary-2@local.test`);

      await insertGuardianLink(studentId, firstGuardianId, 'ACTIVE', true, null);

      await expect(
        insertGuardianLink(studentId, secondGuardianId, 'ACTIVE', true, null),
      ).rejects.toThrow();
    });

    it('rejects ACTIVE guardian row with ends_at set', async () => {
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}guardian-check`, null);
      const guardianUserId = await insertUser(`${TEST_CODE_PREFIX}guardian-check@local.test`);
      const id = generateUuidV4();

      await expect(
        AppDataSource.query(
          `
            INSERT INTO student_guardians (
              id, student_id, guardian_user_id, relationship_type, is_primary, status, starts_at, ends_at
            )
            VALUES (@0, @1, @2, @3, @4, @5, @6, @7)
          `,
          [
            id,
            studentId,
            guardianUserId,
            'PARENT',
            0,
            'ACTIVE',
            new Date('2026-09-01T00:00:00.000Z'),
            new Date('2026-12-31T00:00:00.000Z'),
          ],
        ),
      ).rejects.toThrow();
    });
  });

  describe('classes', () => {
    it('rejects duplicate class code within same parish and academic year', async () => {
      const parishId = await insertParish(`${TEST_CODE_PREFIX}class-parish`, 'Class Parish');
      const yearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}year-1`,
        '2026-09-01',
        '2027-06-30',
      );
      const levelId = await insertCatechismLevel(
        parishId,
        `${TEST_CODE_PREFIX}level-1`,
        'Level 1',
        1,
      );
      const duplicateCode = `${TEST_CODE_PREFIX}class-code`;

      await insertClass(parishId, yearId, levelId, duplicateCode, 'Class One');

      await expect(
        insertClass(parishId, yearId, levelId, duplicateCode, 'Class Two'),
      ).rejects.toThrow();
    });

    it('allows same class code in different academic years', async () => {
      const parishId = await insertParish(`${TEST_CODE_PREFIX}class-year-parish`, 'Year Parish');
      const firstYearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}year-a`,
        '2026-09-01',
        '2027-06-30',
      );
      const secondYearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}year-b`,
        '2027-09-01',
        '2028-06-30',
      );
      const levelId = await insertCatechismLevel(
        parishId,
        `${TEST_CODE_PREFIX}level-shared`,
        'Shared Level',
        1,
      );
      const sharedCode = `${TEST_CODE_PREFIX}shared-code`;

      await insertClass(parishId, firstYearId, levelId, sharedCode, 'Year A Class');
      await insertClass(parishId, secondYearId, levelId, sharedCode, 'Year B Class');

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `SELECT COUNT(*) AS count FROM classes WHERE code = @0`,
        [sharedCode],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('allows same class code in different parishes', async () => {
      const firstParishId = await insertParish(`${TEST_CODE_PREFIX}parish-a`, 'Parish A');
      const secondParishId = await insertParish(`${TEST_CODE_PREFIX}parish-b`, 'Parish B');
      const firstYearId = await insertAcademicYear(
        firstParishId,
        `${TEST_CODE_PREFIX}year-parish-a`,
        '2026-09-01',
        '2027-06-30',
      );
      const secondYearId = await insertAcademicYear(
        secondParishId,
        `${TEST_CODE_PREFIX}year-parish-b`,
        '2026-09-01',
        '2027-06-30',
      );
      const firstLevelId = await insertCatechismLevel(
        firstParishId,
        `${TEST_CODE_PREFIX}level-parish-a`,
        'Level A',
        1,
      );
      const secondLevelId = await insertCatechismLevel(
        secondParishId,
        `${TEST_CODE_PREFIX}level-parish-b`,
        'Level B',
        1,
      );
      const sharedCode = `${TEST_CODE_PREFIX}cross-parish-code`;

      await insertClass(firstParishId, firstYearId, firstLevelId, sharedCode, 'Parish A Class');
      await insertClass(secondParishId, secondYearId, secondLevelId, sharedCode, 'Parish B Class');

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `SELECT COUNT(*) AS count FROM classes WHERE code = @0`,
        [sharedCode],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('rejects invalid parish foreign key on classes', async () => {
      const parishId = await insertParish(`${TEST_CODE_PREFIX}valid-parish`, 'Valid Parish');
      const yearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}valid-year`,
        '2026-09-01',
        '2027-06-30',
      );
      const levelId = await insertCatechismLevel(
        parishId,
        `${TEST_CODE_PREFIX}valid-level`,
        'Valid Level',
        1,
      );

      await expect(
        insertClass(generateUuidV4(), yearId, levelId, `${TEST_CODE_PREFIX}invalid-parish`, 'X'),
      ).rejects.toThrow();
    });
  });

  describe('class_catechist_assignments', () => {
    async function insertAssignment(
      classId: string,
      catechistUserId: string,
      status: 'ACTIVE' | 'ENDED',
      endedAt: Date | null,
    ): Promise<string> {
      const id = generateUuidV4();

      await AppDataSource.query(
        `
          INSERT INTO class_catechist_assignments (
            id, class_id, catechist_user_id, assignment_role, status, assigned_at, ended_at
          )
          VALUES (@0, @1, @2, @3, @4, @5, @6)
        `,
        [
          id,
          classId,
          catechistUserId,
          'LEAD',
          status,
          new Date('2026-09-01T00:00:00.000Z'),
          endedAt,
        ],
      );

      return id;
    }

    async function createClassFixture(codeSuffix: string): Promise<string> {
      const parishId = await insertParish(
        `${TEST_CODE_PREFIX}cat-parish-${codeSuffix}`,
        'Cat Parish',
      );
      const yearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}cat-year-${codeSuffix}`,
        '2026-09-01',
        '2027-06-30',
      );
      const levelId = await insertCatechismLevel(
        parishId,
        `${TEST_CODE_PREFIX}cat-level-${codeSuffix}`,
        'Cat Level',
        1,
      );

      return insertClass(
        parishId,
        yearId,
        levelId,
        `${TEST_CODE_PREFIX}cat-class-${codeSuffix}`,
        'Cat Class',
      );
    }

    it('rejects duplicate ACTIVE assignment for same class and catechist', async () => {
      const classId = await createClassFixture('dup');
      const catechistUserId = await insertUser(`${TEST_CODE_PREFIX}catechist-dup@local.test`);

      await insertAssignment(classId, catechistUserId, 'ACTIVE', null);

      await expect(insertAssignment(classId, catechistUserId, 'ACTIVE', null)).rejects.toThrow();
    });

    it('allows ENDED history and new ACTIVE assignment for same pair', async () => {
      const classId = await createClassFixture('history');
      const catechistUserId = await insertUser(`${TEST_CODE_PREFIX}catechist-history@local.test`);

      await insertAssignment(
        classId,
        catechistUserId,
        'ENDED',
        new Date('2026-12-31T00:00:00.000Z'),
      );
      await insertAssignment(classId, catechistUserId, 'ACTIVE', null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM class_catechist_assignments
          WHERE class_id = @0 AND catechist_user_id = @1
        `,
        [classId, catechistUserId],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('allows same catechist assigned to multiple classes', async () => {
      const firstClassId = await createClassFixture('multi-a');
      const secondClassId = await createClassFixture('multi-b');
      const catechistUserId = await insertUser(`${TEST_CODE_PREFIX}catechist-multi@local.test`);

      await insertAssignment(firstClassId, catechistUserId, 'ACTIVE', null);
      await insertAssignment(secondClassId, catechistUserId, 'ACTIVE', null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM class_catechist_assignments
          WHERE catechist_user_id = @0 AND status = 'ACTIVE'
        `,
        [catechistUserId],
      );

      expect(rows[0]?.count).toBe(2);
    });
  });

  describe('enrollments', () => {
    async function insertEnrollment(
      studentId: string,
      classId: string,
      parishId: string,
      academicYearId: string,
      status: 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN' | 'TRANSFERRED',
      leftAt: Date | null,
    ): Promise<string> {
      const id = generateUuidV4();

      await AppDataSource.query(
        `
          INSERT INTO enrollments (
            id, student_id, class_id, parish_id, academic_year_id, status, enrolled_at, left_at
          )
          VALUES (@0, @1, @2, @3, @4, @5, @6, @7)
        `,
        [
          id,
          studentId,
          classId,
          parishId,
          academicYearId,
          status,
          new Date('2026-09-01T00:00:00.000Z'),
          leftAt,
        ],
      );

      return id;
    }

    async function createEnrollmentFixture(suffix: string): Promise<{
      studentId: string;
      classId: string;
      parishId: string;
      yearId: string;
      levelId: string;
    }> {
      const parishId = await insertParish(`${TEST_CODE_PREFIX}enr-parish-${suffix}`, 'Enr Parish');
      const yearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}enr-year-${suffix}`,
        '2026-09-01',
        '2027-06-30',
      );
      const levelId = await insertCatechismLevel(
        parishId,
        `${TEST_CODE_PREFIX}enr-level-${suffix}`,
        'Enr Level',
        1,
      );
      const classId = await insertClass(
        parishId,
        yearId,
        levelId,
        `${TEST_CODE_PREFIX}enr-class-${suffix}`,
        'Enr Class',
      );
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}enr-student-${suffix}`, null);

      return { studentId, classId, parishId, yearId, levelId };
    }

    it('rejects second ACTIVE enrollment for same student parish and academic year', async () => {
      const fixture = await createEnrollmentFixture('one-active');
      const secondClassId = await insertClass(
        fixture.parishId,
        fixture.yearId,
        fixture.levelId,
        `${TEST_CODE_PREFIX}enr-class-second`,
        'Second Class',
      );

      await insertEnrollment(
        fixture.studentId,
        fixture.classId,
        fixture.parishId,
        fixture.yearId,
        'ACTIVE',
        null,
      );

      await expect(
        insertEnrollment(
          fixture.studentId,
          secondClassId,
          fixture.parishId,
          fixture.yearId,
          'ACTIVE',
          null,
        ),
      ).rejects.toThrow();
    });

    it('allows terminal old enrollment and new ACTIVE enrollment in same year', async () => {
      const fixture = await createEnrollmentFixture('transfer');
      const secondClassId = await insertClass(
        fixture.parishId,
        fixture.yearId,
        fixture.levelId,
        `${TEST_CODE_PREFIX}enr-class-transfer-b`,
        'Transfer Class',
      );

      await insertEnrollment(
        fixture.studentId,
        fixture.classId,
        fixture.parishId,
        fixture.yearId,
        'TRANSFERRED',
        new Date('2026-10-01T00:00:00.000Z'),
      );

      await insertEnrollment(
        fixture.studentId,
        secondClassId,
        fixture.parishId,
        fixture.yearId,
        'ACTIVE',
        null,
      );

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM enrollments
          WHERE student_id = @0 AND parish_id = @1 AND academic_year_id = @2
        `,
        [fixture.studentId, fixture.parishId, fixture.yearId],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('allows ACTIVE enrollments in different academic years', async () => {
      const parishId = await insertParish(`${TEST_CODE_PREFIX}enr-multi-year-parish`, 'Multi Year');
      const firstYearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}enr-multi-year-a`,
        '2026-09-01',
        '2027-06-30',
      );
      const secondYearId = await insertAcademicYear(
        parishId,
        `${TEST_CODE_PREFIX}enr-multi-year-b`,
        '2027-09-01',
        '2028-06-30',
      );
      const levelId = await insertCatechismLevel(
        parishId,
        `${TEST_CODE_PREFIX}enr-multi-level`,
        'Multi Level',
        1,
      );
      const firstClassId = await insertClass(
        parishId,
        firstYearId,
        levelId,
        `${TEST_CODE_PREFIX}enr-multi-class-a`,
        'Year A Class',
      );
      const secondClassId = await insertClass(
        parishId,
        secondYearId,
        levelId,
        `${TEST_CODE_PREFIX}enr-multi-class-b`,
        'Year B Class',
      );
      const studentId = await insertStudent(`${TEST_CODE_PREFIX}enr-multi-year-student`, null);

      await insertEnrollment(studentId, firstClassId, parishId, firstYearId, 'ACTIVE', null);
      await insertEnrollment(studentId, secondClassId, parishId, secondYearId, 'ACTIVE', null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM enrollments
          WHERE student_id = @0 AND status = 'ACTIVE'
        `,
        [studentId],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('rejects ACTIVE enrollment with left_at set', async () => {
      const fixture = await createEnrollmentFixture('check');

      await expect(
        insertEnrollment(
          fixture.studentId,
          fixture.classId,
          fixture.parishId,
          fixture.yearId,
          'ACTIVE',
          new Date('2026-10-01T00:00:00.000Z'),
        ),
      ).rejects.toThrow();
    });
  });

  describe('parish_memberships', () => {
    async function insertMembership(
      parishId: string,
      userId: string,
      status: 'ACTIVE' | 'ENDED',
      endedAt: Date | null,
    ): Promise<string> {
      const id = generateUuidV4();

      await AppDataSource.query(
        `
          INSERT INTO parish_memberships (id, parish_id, user_id, status, joined_at, ended_at)
          VALUES (@0, @1, @2, @3, @4, @5)
        `,
        [id, parishId, userId, status, new Date('2026-09-01T00:00:00.000Z'), endedAt],
      );

      return id;
    }

    it('rejects duplicate ACTIVE membership for same parish and user', async () => {
      const parishId = await insertParish(`${TEST_CODE_PREFIX}member-parish`, 'Member Parish');
      const userId = await insertUser(`${TEST_CODE_PREFIX}member-user@local.test`);

      await insertMembership(parishId, userId, 'ACTIVE', null);

      await expect(insertMembership(parishId, userId, 'ACTIVE', null)).rejects.toThrow();
    });

    it('allows ENDED history and new ACTIVE membership for same pair', async () => {
      const parishId = await insertParish(
        `${TEST_CODE_PREFIX}member-history-parish`,
        'History Parish',
      );
      const userId = await insertUser(`${TEST_CODE_PREFIX}member-history@local.test`);

      await insertMembership(parishId, userId, 'ENDED', new Date('2026-12-31T00:00:00.000Z'));
      await insertMembership(parishId, userId, 'ACTIVE', null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM parish_memberships
          WHERE parish_id = @0 AND user_id = @1
        `,
        [parishId, userId],
      );

      expect(rows[0]?.count).toBe(2);
    });

    it('allows ACTIVE memberships for one user in multiple parishes', async () => {
      const firstParishId = await insertParish(`${TEST_CODE_PREFIX}member-parish-a`, 'Parish A');
      const secondParishId = await insertParish(`${TEST_CODE_PREFIX}member-parish-b`, 'Parish B');
      const userId = await insertUser(`${TEST_CODE_PREFIX}member-multi@local.test`);

      await insertMembership(firstParishId, userId, 'ACTIVE', null);
      await insertMembership(secondParishId, userId, 'ACTIVE', null);

      const rows = await AppDataSource.query<Array<{ count: number }>>(
        `
          SELECT COUNT(*) AS count
          FROM parish_memberships
          WHERE user_id = @0 AND status = 'ACTIVE'
        `,
        [userId],
      );

      expect(rows[0]?.count).toBe(2);
    });
  });
});
