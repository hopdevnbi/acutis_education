import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isCiEnvironment, loadCliDataSourceEnvironment } from './load-cli-data-source-environment';

describe('loadCliDataSourceEnvironment', () => {
  const originalEnvironment = process.env;
  const originalWorkingDirectory = process.cwd();
  let temporaryDirectory = '';

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'catechism-cli-env-'));
    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    process.chdir(originalWorkingDirectory);
    process.env = originalEnvironment;

    if (temporaryDirectory.length > 0 && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('reports CI mode when CI=true', () => {
    process.env['CI'] = 'true';

    expect(isCiEnvironment()).toBe(true);
  });

  it('requires a local .env file outside CI mode', () => {
    delete process.env['CI'];

    expect(() => loadCliDataSourceEnvironment()).toThrow(
      'A local .env file is required for TypeORM CLI commands.',
    );
  });

  it('loads a local .env file outside CI mode', () => {
    delete process.env['CI'];
    writeFileSync(join(temporaryDirectory, '.env'), 'DB_HOST=localhost\n', 'utf8');

    expect(() => loadCliDataSourceEnvironment()).not.toThrow();
    expect(process.env['DB_HOST']).toBe('localhost');
  });

  it('uses process environment in CI mode without requiring .env', () => {
    process.env['CI'] = 'true';
    process.env['DB_HOST'] = 'localhost';
    process.env['DB_PORT'] = '1433';
    process.env['DB_NAME'] = 'catechism_api_test';
    process.env['DB_USER'] = 'sa';
    process.env['DB_PASSWORD'] = 'ci-test-password';

    expect(() => loadCliDataSourceEnvironment()).not.toThrow();
    expect(existsSync(join(temporaryDirectory, '.env'))).toBe(false);
    expect(process.env['DB_HOST']).toBe('localhost');
  });

  it('does not fall back to .env.example in CI mode', () => {
    process.env['CI'] = 'true';
    delete process.env['DB_HOST'];
    writeFileSync(join(temporaryDirectory, '.env.example'), 'DB_HOST=example-host\n', 'utf8');

    loadCliDataSourceEnvironment();

    expect(process.env['DB_HOST']).toBeUndefined();
  });
});
