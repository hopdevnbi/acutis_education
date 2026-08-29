import {
  buildDatabaseConfiguration,
  resolveDatabaseEncrypt,
  resolveDatabaseTrustServerCertificate,
} from './database.configuration';

describe('database configuration parsing', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'development',
      DB_HOST: 'localhost',
      DB_PORT: '1433',
      DB_NAME: 'catechism_api',
      DB_USER: 'sa',
      DB_PASSWORD: 'test-password',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('parses a valid database configuration', () => {
    expect(buildDatabaseConfiguration(process.env)).toEqual({
      host: 'localhost',
      port: 1433,
      database: 'catechism_api',
      username: 'sa',
      password: 'test-password',
      encrypt: true,
      trustServerCertificate: true,
    });
  });

  it('defaults trustServerCertificate to false outside development', () => {
    process.env['NODE_ENV'] = 'production';
    delete process.env['DB_TRUST_SERVER_CERTIFICATE'];

    expect(buildDatabaseConfiguration(process.env).trustServerCertificate).toBe(false);
  });

  it('rejects missing DB_HOST values', () => {
    delete process.env['DB_HOST'];

    expect(() => buildDatabaseConfiguration(process.env)).toThrow('DB_HOST is required');
  });

  it('rejects invalid DB_PORT values', () => {
    process.env['DB_PORT'] = '99999';

    expect(() => buildDatabaseConfiguration(process.env)).toThrow('Invalid DB_PORT value');
  });

  it('rejects invalid boolean DB_ENCRYPT values', () => {
    expect(() => resolveDatabaseEncrypt('maybe', 'production')).toThrow('Invalid DB_ENCRYPT value');
  });

  it('rejects invalid boolean DB_TRUST_SERVER_CERTIFICATE values', () => {
    expect(() => resolveDatabaseTrustServerCertificate('maybe', 'production')).toThrow(
      'Invalid DB_TRUST_SERVER_CERTIFICATE value',
    );
  });
});
