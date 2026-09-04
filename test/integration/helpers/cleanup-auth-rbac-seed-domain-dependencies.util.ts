import type { DataSource } from 'typeorm';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../../../src/database/seeds/parish-academic.seed.constants';
import { deleteClassOperationsRowsForParishCode } from './delete-class-operations-rows-for-parish-code.util';
import { deleteExamEngineRowsForParishCode } from './delete-exam-engine-rows-for-parish-code.util';

/**
 * Removes demo parish exam rows and student/enrollment data linked to seeded auth users
 * before auth-rbac seed teardown deletes users.
 */
export async function cleanupAuthRbacSeedDomainDependencies(
  dataSource: DataSource,
  sampleDomain: string,
): Promise<void> {
  const safeDomain = sampleDomain.replace(/'/g, "''");

  await deleteExamEngineRowsForParishCode(dataSource, PARISH_ACADEMIC_SAMPLE_PARISH_CODE);
  await deleteClassOperationsRowsForParishCode(dataSource, PARISH_ACADEMIC_SAMPLE_PARISH_CODE);

  await dataSource.query(`
    UPDATE question_versions
    SET created_by_user_id = NULL
    WHERE created_by_user_id IN (
      SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
    )
  `);

  await dataSource.query(`
    UPDATE question_versions
    SET published_by_user_id = NULL
    WHERE published_by_user_id IN (
      SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
    )
  `);

  await dataSource.query(`
    UPDATE questions
    SET created_by_user_id = NULL
    WHERE created_by_user_id IN (
      SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
    )
  `);

  await dataSource.query(`
    DELETE FROM practice_sessions
    WHERE enrollment_id IN (
      SELECT e.id FROM enrollments e
      INNER JOIN students s ON s.id = e.student_id
      WHERE s.user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
      )
      OR s.full_name LIKE 'Demo Student%'
    )
  `);

  await dataSource.query(`
    DELETE FROM lesson_progress
    WHERE enrollment_id IN (
      SELECT e.id FROM enrollments e
      INNER JOIN students s ON s.id = e.student_id
      WHERE s.user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
      )
      OR s.full_name LIKE 'Demo Student%'
    )
  `);

  await dataSource.query(`
    DELETE FROM enrollments
    WHERE student_id IN (
      SELECT id FROM students
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
      )
      OR full_name LIKE 'Demo Student%'
    )
  `);

  await dataSource.query(`
    DELETE FROM student_guardians
    WHERE guardian_user_id IN (
      SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
    )
    OR student_id IN (
      SELECT id FROM students
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
      )
      OR full_name LIKE 'Demo Student%'
    )
  `);

  await dataSource.query(`
    DELETE FROM students
    WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@${safeDomain}'
    )
    OR full_name LIKE 'Demo Student%'
  `);
}
