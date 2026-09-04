import type { DataSource } from 'typeorm';

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Deletes Class Operations rows for a demo parish in FK-safe order
 * (attendance → roster → sessions) before enrollments/classes can be removed.
 */
export async function deleteClassOperationsRowsForParishCode(
  dataSource: DataSource,
  parishCode: string,
): Promise<void> {
  const safeParishCode = escapeSqlLiteral(parishCode);

  const parishSessionIdsSubquery = `
    SELECT cs.id FROM class_sessions cs
    INNER JOIN parishes p ON p.id = cs.parish_id
    WHERE p.code = '${safeParishCode}'
  `;

  await dataSource.query(`
    DELETE FROM attendance_records
    WHERE session_id IN (${parishSessionIdsSubquery})
  `);

  await dataSource.query(`
    DELETE FROM class_session_roster
    WHERE session_id IN (${parishSessionIdsSubquery})
  `);

  await dataSource.query(`
    DELETE FROM class_sessions
    WHERE parish_id IN (
      SELECT id FROM parishes WHERE code = '${safeParishCode}'
    )
  `);
}

/**
 * Deletes Class Operations rows for parishes matching a code prefix (FK-safe).
 */
export async function deleteClassOperationsRowsForParishCodePrefix(
  dataSource: DataSource,
  parishCodePrefix: string,
): Promise<void> {
  const safePrefix = escapeSqlLiteral(parishCodePrefix);

  const parishSessionIdsSubquery = `
    SELECT cs.id FROM class_sessions cs
    INNER JOIN parishes p ON p.id = cs.parish_id
    WHERE p.code LIKE '${safePrefix}%'
  `;

  await dataSource.query(`
    DELETE FROM attendance_records
    WHERE session_id IN (${parishSessionIdsSubquery})
  `);

  await dataSource.query(`
    DELETE FROM class_session_roster
    WHERE session_id IN (${parishSessionIdsSubquery})
  `);

  await dataSource.query(`
    DELETE FROM class_sessions
    WHERE parish_id IN (
      SELECT id FROM parishes WHERE code LIKE '${safePrefix}%'
    )
  `);
}
