import type { DataSource } from 'typeorm';

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Deletes Exam Engine rows for a demo parish in FK-safe order.
 * Optional examCode narrows deletion to one exam (exam-demo seed cleanup).
 */
export async function deleteExamEngineRowsForParishCode(
  dataSource: DataSource,
  parishCode: string,
  examCode?: string,
): Promise<void> {
  const safeParishCode = escapeSqlLiteral(parishCode);
  const examCodeFilter =
    examCode === undefined ? '' : ` AND e.code = '${escapeSqlLiteral(examCode)}'`;

  const parishExamIdsSubquery = `
    SELECT e.id FROM exams e
    INNER JOIN parishes p ON p.id = e.parish_id
    WHERE p.code = '${safeParishCode}'${examCodeFilter}
  `;

  const parishAttemptIdsSubquery =
    examCode === undefined
      ? `
    SELECT ea.id FROM exam_attempts ea
    INNER JOIN parishes p ON p.id = ea.parish_id
    WHERE p.code = '${safeParishCode}'
  `
      : `
    SELECT ea.id FROM exam_attempts ea
    WHERE ea.exam_id IN (${parishExamIdsSubquery})
  `;

  await dataSource.query(`
    DELETE FROM exam_attempt_answers
    WHERE exam_attempt_question_id IN (
      SELECT eaq.id FROM exam_attempt_questions eaq
      WHERE eaq.exam_attempt_id IN (${parishAttemptIdsSubquery})
    )
  `);

  await dataSource.query(`
    DELETE FROM exam_attempt_questions
    WHERE exam_attempt_id IN (${parishAttemptIdsSubquery})
  `);

  await dataSource.query(`
    DELETE FROM exam_attempts
    WHERE id IN (${parishAttemptIdsSubquery})
  `);

  if (examCode === undefined) {
    await dataSource.query(`
      DELETE FROM exam_assignments
      WHERE class_id IN (
        SELECT c.id FROM classes c
        INNER JOIN parishes p ON p.id = c.parish_id
        WHERE p.code = '${safeParishCode}'
      )
    `);
  } else {
    await dataSource.query(`
      DELETE FROM exam_assignments
      WHERE exam_version_id IN (
        SELECT ev.id FROM exam_versions ev
        WHERE ev.exam_id IN (${parishExamIdsSubquery})
      )
    `);
  }

  await dataSource.query(`
    DELETE FROM exam_version_questions
    WHERE exam_version_id IN (
      SELECT ev.id FROM exam_versions ev
      WHERE ev.exam_id IN (${parishExamIdsSubquery})
    )
  `);

  await dataSource.query(`
    UPDATE exams
    SET current_published_version_id = NULL
    WHERE id IN (${parishExamIdsSubquery})
  `);

  await dataSource.query(`
    DELETE FROM exam_versions
    WHERE exam_id IN (${parishExamIdsSubquery})
  `);

  await dataSource.query(`
    DELETE FROM exams
    WHERE id IN (${parishExamIdsSubquery})
  `);
}
