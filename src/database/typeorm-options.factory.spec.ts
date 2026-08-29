import {
  buildSanitizedTypeOrmOptionsForLogging,
  buildTypeOrmDataSourceOptions,
} from './typeorm-options.factory';
import { TYPEORM_MIGRATIONS_TABLE_NAME } from './database.constants';

describe('buildTypeOrmDataSourceOptions', () => {
  const databaseConfiguration = {
    host: 'localhost',
    port: 1433,
    database: 'catechism_api',
    username: 'sa',
    password: 'super-secret-password',
    encrypt: true,
    trustServerCertificate: true,
  } as const;

  it('always disables synchronize and automatic migration execution', () => {
    const options = buildTypeOrmDataSourceOptions(
      databaseConfiguration,
      'development',
      'cli-typescript',
    );

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });

  it('configures MSSQL with the project migration table and naming strategy', () => {
    const options = buildTypeOrmDataSourceOptions(
      databaseConfiguration,
      'development',
      'cli-typescript',
    );

    expect(options.type).toBe('mssql');
    expect(options.migrationsTableName).toBe(TYPEORM_MIGRATIONS_TABLE_NAME);
    expect(options.namingStrategy).toBeDefined();
    expect(options.migrations).toEqual([expect.stringContaining('migrations')]);
  });

  it('uses typescript migration globs for CLI development runtime', () => {
    const options = buildTypeOrmDataSourceOptions(
      databaseConfiguration,
      'development',
      'cli-typescript',
    );
    const migrationPaths = options.migrations as string[];

    expect(migrationPaths[0]).toContain('migrations');
    expect(migrationPaths[0]).toMatch(/\.ts$/);
  });

  it('uses javascript migration globs for compiled runtime', () => {
    const options = buildTypeOrmDataSourceOptions(databaseConfiguration, 'test', 'cli-javascript');
    const migrationPaths = options.migrations as string[];

    expect(migrationPaths[0]).toContain('migrations');
    expect(migrationPaths[0]).toMatch(/\.js$/);
  });

  it('never exposes database passwords in sanitized logging output', () => {
    const options = buildTypeOrmDataSourceOptions(
      databaseConfiguration,
      'production',
      'cli-typescript',
    );
    const sanitizedOptions = buildSanitizedTypeOrmOptionsForLogging(options);

    expect(sanitizedOptions['password']).toBe('[REDACTED]');
    expect(JSON.stringify(sanitizedOptions)).not.toContain('super-secret-password');
  });
});
