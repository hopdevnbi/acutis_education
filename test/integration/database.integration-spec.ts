import { buildDatabaseConfiguration } from '../../src/config/database.configuration';
import { parseNodeEnvironment } from '../../src/config/app.configuration';
import AppDataSource from '../../src/database/data-source';
import { TYPEORM_MIGRATIONS_TABLE_NAME } from '../../src/database/database.constants';
import { buildTypeOrmDataSourceOptions } from '../../src/database/typeorm-options.factory';

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

  it('reports migration metadata state and no unexpected business tables', async () => {
    await AppDataSource.initialize();

    try {
      const hasPendingMigrations = await AppDataSource.showMigrations();
      expect(typeof hasPendingMigrations).toBe('boolean');

      const businessTablesResult = await AppDataSource.query<Array<{ TABLE_NAME: string }>>(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME NOT IN ('${TYPEORM_MIGRATIONS_TABLE_NAME}')
      `);

      expect(businessTablesResult).toHaveLength(0);
    } finally {
      await AppDataSource.destroy();
    }
  });
});
