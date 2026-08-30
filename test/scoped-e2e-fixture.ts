import AppDataSource from '../src/database/data-source';
import { generateUuidV4 } from '../src/database/uuid-v4.util';

export async function ensureTestParishMembership(userId: string, parishId: string): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.query(
    `
      IF NOT EXISTS (
        SELECT 1
        FROM parish_memberships
        WHERE parish_id = @0 AND user_id = @1 AND status = 'ACTIVE'
      )
      INSERT INTO parish_memberships (
        id, parish_id, user_id, status, joined_at, ended_at, created_at, updated_at
      )
      VALUES (NEWID(), @0, @1, 'ACTIVE', GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE())
    `,
    [parishId, userId],
  );
}

export async function seedScopedParishForUser(
  userId: string,
  codePrefix: string,
): Promise<{ parishId: string }> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const parishId = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO parishes (id, code, name, status, created_at, updated_at)
      VALUES (@0, @1, @2, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [parishId, `${codePrefix}parish`, 'Scoped Test Parish'],
  );
  await ensureTestParishMembership(userId, parishId);

  return { parishId };
}

export async function seedActiveEnrollmentForStudent(
  studentId: string,
  parishId: string,
  codePrefix: string,
): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const academicYearId = generateUuidV4();
  const catechismLevelId = generateUuidV4();
  const classId = generateUuidV4();
  const enrollmentId = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO academic_years (
        id, parish_id, name, start_date, end_date, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, '2026-09-01', '2027-06-30', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [academicYearId, parishId, `${codePrefix}year`],
  );
  await AppDataSource.query(
    `
      INSERT INTO catechism_levels (
        id, parish_id, code, name, sort_order, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, 'Level One', 1, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [catechismLevelId, parishId, `${codePrefix}level`],
  );
  await AppDataSource.query(
    `
      INSERT INTO classes (
        id, parish_id, academic_year_id, catechism_level_id, code, name, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, @3, @4, 'Scoped Class', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [classId, parishId, academicYearId, catechismLevelId, `${codePrefix}class`],
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
}
