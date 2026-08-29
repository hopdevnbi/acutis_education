import AppDataSource from './data-source';

describe('AppDataSource', () => {
  it('loads TypeORM DataSource configuration for CLI operations', () => {
    expect(AppDataSource.options.type).toBe('mssql');
    expect(AppDataSource.options.synchronize).toBe(false);
    expect(AppDataSource.options.migrationsRun).toBe(false);
    expect(AppDataSource.options.migrationsTableName).toBe('typeorm_migrations');
  });
});
