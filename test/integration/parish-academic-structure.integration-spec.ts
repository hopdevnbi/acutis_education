import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'par002-';

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

describe('Parish academic structure integration (MSSQL)', () => {
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
      DELETE FROM catechism_levels
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE name LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('persists Vietnamese parish names in nvarchar columns', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}vn`, 'Giáo xứ Thánh Gia');

    const rows = await AppDataSource.query<Array<{ name: string }>>(
      `SELECT name FROM parishes WHERE id = @0`,
      [parishId],
    );

    expect(rows[0]?.name).toBe('Giáo xứ Thánh Gia');
  });

  it('round-trips academic year DATE values without timezone shift', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}dates`, 'Date Parish');
    const startDate = '2026-09-01';
    const endDate = '2027-06-30';

    const academicYearId = await insertAcademicYear(
      parishId,
      `${TEST_CODE_PREFIX}2026-2027`,
      startDate,
      endDate,
    );

    const rows = await AppDataSource.query<Array<{ start_date: string; end_date: string }>>(
      `
        SELECT
          CONVERT(varchar(10), start_date, 23) AS start_date,
          CONVERT(varchar(10), end_date, 23) AS end_date
        FROM academic_years
        WHERE id = @0
      `,
      [academicYearId],
    );

    expect(rows[0]?.start_date).toBe(startDate);
    expect(rows[0]?.end_date).toBe(endDate);
  });

  it('rejects duplicate parish codes', async () => {
    const duplicateCode = `${TEST_CODE_PREFIX}dup-code`;

    await insertParish(duplicateCode, 'First Parish');

    await expect(insertParish(duplicateCode, 'Second Parish')).rejects.toThrow();
  });

  it('rejects duplicate academic year names within the same parish', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}year-dup`, 'Year Dup Parish');
    const yearName = `${TEST_CODE_PREFIX}same-year`;

    await insertAcademicYear(parishId, yearName, '2026-09-01', '2027-06-30');

    await expect(
      insertAcademicYear(parishId, yearName, '2027-09-01', '2028-06-30'),
    ).rejects.toThrow();
  });

  it('allows the same academic year name across different parishes', async () => {
    const firstParishId = await insertParish(`${TEST_CODE_PREFIX}year-a`, 'Parish A');
    const secondParishId = await insertParish(`${TEST_CODE_PREFIX}year-b`, 'Parish B');
    const sharedYearName = `${TEST_CODE_PREFIX}shared-year`;

    await expect(
      insertAcademicYear(firstParishId, sharedYearName, '2026-09-01', '2027-06-30'),
    ).resolves.toBeDefined();

    await expect(
      insertAcademicYear(secondParishId, sharedYearName, '2026-09-01', '2027-06-30'),
    ).resolves.toBeDefined();
  });

  it('rejects academic years where start_date is not before end_date', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}invalid-dates`, 'Invalid Dates Parish');

    await expect(
      insertAcademicYear(parishId, `${TEST_CODE_PREFIX}invalid-range`, '2027-06-30', '2026-09-01'),
    ).rejects.toThrow();

    await expect(
      insertAcademicYear(parishId, `${TEST_CODE_PREFIX}equal-dates`, '2026-09-01', '2026-09-01'),
    ).rejects.toThrow();
  });

  it('rejects duplicate catechism level codes within the same parish', async () => {
    const parishId = await insertParish(`${TEST_CODE_PREFIX}level-dup`, 'Level Dup Parish');
    const duplicateCode = `${TEST_CODE_PREFIX}level-code`;

    await insertCatechismLevel(parishId, duplicateCode, 'Level One', 1);

    await expect(insertCatechismLevel(parishId, duplicateCode, 'Level Two', 2)).rejects.toThrow();
  });

  it('allows the same catechism level code across different parishes', async () => {
    const firstParishId = await insertParish(`${TEST_CODE_PREFIX}level-a`, 'Level Parish A');
    const secondParishId = await insertParish(`${TEST_CODE_PREFIX}level-b`, 'Level Parish B');
    const sharedCode = `${TEST_CODE_PREFIX}shared-level`;

    await expect(
      insertCatechismLevel(firstParishId, sharedCode, 'Level A', 1),
    ).resolves.toBeDefined();
    await expect(
      insertCatechismLevel(secondParishId, sharedCode, 'Level B', 1),
    ).resolves.toBeDefined();
  });

  it('rejects academic years and catechism levels with invalid parish_id foreign keys', async () => {
    const missingParishId = generateUuidV4();

    await expect(
      insertAcademicYear(
        missingParishId,
        `${TEST_CODE_PREFIX}missing-parish-year`,
        '2026-09-01',
        '2027-06-30',
      ),
    ).rejects.toThrow();

    await expect(
      insertCatechismLevel(
        missingParishId,
        `${TEST_CODE_PREFIX}missing-parish-level`,
        'Missing Level',
        1,
      ),
    ).rejects.toThrow();
  });

  it('stores parish primary key ids without database-generated UUID defaults', async () => {
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
      WHERE t.name IN ('parishes', 'academic_years', 'catechism_levels')
        AND c.name = 'id'
      ORDER BY t.name
    `);

    expect(defaultConstraintResult).toHaveLength(3);
    expect(defaultConstraintResult.every((row) => row.default_definition === null)).toBe(true);
  });

  it('includes required parish academic structure tables and constraints', async () => {
    const tablesResult = await AppDataSource.query<Array<{ TABLE_NAME: string }>>(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME IN ('parishes', 'academic_years', 'catechism_levels')
      ORDER BY TABLE_NAME
    `);

    expect(tablesResult.map((row) => row.TABLE_NAME)).toEqual([
      'academic_years',
      'catechism_levels',
      'parishes',
    ]);

    const checkConstraintResult = await AppDataSource.query<Array<{ constraint_name: string }>>(`
      SELECT name AS constraint_name
      FROM sys.check_constraints
      WHERE name = 'CK_academic_years_start_date_before_end_date'
    `);

    expect(checkConstraintResult).toHaveLength(1);

    const foreignKeyResult = await AppDataSource.query<Array<{ foreign_key_name: string }>>(`
      SELECT name AS foreign_key_name
      FROM sys.foreign_keys
      WHERE name IN (
        'FK_academic_years_parish_id_parishes_id',
        'FK_catechism_levels_parish_id_parishes_id'
      )
      ORDER BY name
    `);

    expect(foreignKeyResult.map((row) => row.foreign_key_name)).toEqual([
      'FK_academic_years_parish_id_parishes_id',
      'FK_catechism_levels_parish_id_parishes_id',
    ]);
  });
});
