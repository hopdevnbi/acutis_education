import { buildDatabaseConfiguration } from '../../src/config/database.configuration';
import { parseNodeEnvironment } from '../../src/config/app.configuration';
import AppDataSource from '../../src/database/data-source';
import { TYPEORM_MIGRATIONS_TABLE_NAME } from '../../src/database/database.constants';
import { buildTypeOrmDataSourceOptions } from '../../src/database/typeorm-options.factory';

const EXPECTED_AUTH_TABLES = [
  'auth_sessions',
  'permissions',
  'role_permissions',
  'roles',
  'user_roles',
  'users',
] as const;

describe('Database integration (MSSQL)', () => {
  const expectedDatabaseName = process.env['DB_NAME'];

  if (expectedDatabaseName === undefined) {
    throw new Error('DB_NAME must be configured before database integration tests run.');
  }

  it('initializes and destroys a TypeORM DataSource against the dedicated test database', async () => {
    expect(AppDataSource.isInitialized).toBe(false);

    await AppDataSource.initialize();

    try {
      expect(AppDataSource.isInitialized).toBe(true);
    } finally {
      await AppDataSource.destroy();
      expect(AppDataSource.isInitialized).toBe(false);
    }
  });

  it('executes SELECT 1 against MSSQL', async () => {
    await AppDataSource.initialize();

    try {
      const queryResult = await AppDataSource.query<Array<{ value: number }>>('SELECT 1 AS value');

      expect(queryResult[0]?.value).toBe(1);
    } finally {
      await AppDataSource.destroy();
    }
  });

  it('confirms DB_NAME() matches the configured dedicated test database', async () => {
    await AppDataSource.initialize();

    try {
      const queryResult = await AppDataSource.query<Array<{ database_name: string }>>(
        'SELECT DB_NAME() AS database_name',
      );

      expect(queryResult[0]?.database_name).toBe(expectedDatabaseName);
      expect(queryResult[0]?.database_name).not.toBe('catechism_api');
    } finally {
      await AppDataSource.destroy();
    }
  });

  it('keeps synchronize and migrationsRun disabled in DataSource options', () => {
    const databaseConfiguration = buildDatabaseConfiguration(process.env);
    const nodeEnv = parseNodeEnvironment(process.env['NODE_ENV']);
    const dataSourceOptions = buildTypeOrmDataSourceOptions(
      databaseConfiguration,
      nodeEnv,
      'cli-typescript',
    );

    expect(dataSourceOptions.synchronize).toBe(false);
    expect(dataSourceOptions.migrationsRun).toBe(false);
  });

  it('applies auth foundation migrations and includes required auth business tables', async () => {
    await AppDataSource.initialize();

    try {
      const hasPendingMigrations = await AppDataSource.showMigrations();

      if (hasPendingMigrations) {
        await AppDataSource.runMigrations();
      }

      const businessTablesResult = await AppDataSource.query<Array<{ TABLE_NAME: string }>>(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME NOT IN ('${TYPEORM_MIGRATIONS_TABLE_NAME}')
        ORDER BY TABLE_NAME
      `);

      const businessTableNames = businessTablesResult.map((row) => row.TABLE_NAME);

      expect(businessTableNames).toEqual(expect.arrayContaining([...EXPECTED_AUTH_TABLES]));
    } finally {
      await AppDataSource.destroy();
    }
  });

  it('stores auth primary key ids without database-generated UUID defaults', async () => {
    await AppDataSource.initialize();

    try {
      const hasPendingMigrations = await AppDataSource.showMigrations();

      if (hasPendingMigrations) {
        await AppDataSource.runMigrations();
      }

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
        WHERE t.name IN ('users', 'roles', 'permissions', 'auth_sessions')
          AND c.name = 'id'
        ORDER BY t.name
      `);

      expect(defaultConstraintResult).toHaveLength(4);
      expect(defaultConstraintResult.every((row) => row.default_definition === null)).toBe(true);
    } finally {
      await AppDataSource.destroy();
    }
  });
});
