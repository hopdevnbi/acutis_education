import { waitForMssqlAvailability } from '../../scripts/wait-for-mssql';

describe('waitForMssqlAvailability', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      DB_HOST: 'localhost',
      DB_PORT: '1433',
      DB_USER: 'sa',
      DB_PASSWORD: 'test-password',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('rejects missing DB_PASSWORD before attempting a connection', async () => {
    delete process.env['DB_PASSWORD'];

    await expect(waitForMssqlAvailability({ maxAttempts: 1, retryDelayMs: 1 })).rejects.toThrow(
      'DB_PASSWORD is required for MSSQL readiness checks.',
    );
  });

  it('rejects invalid DB_PORT values', async () => {
    process.env['DB_PORT'] = 'not-a-port';

    await expect(waitForMssqlAvailability({ maxAttempts: 1, retryDelayMs: 1 })).rejects.toThrow(
      'Invalid numeric environment value',
    );
  });
});
