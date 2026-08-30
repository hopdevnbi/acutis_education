import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnvironmentFile } from 'dotenv';
import { DEFAULT_TEST_DATABASE_NAME } from './test-database.constants';
import { assertSafeTestDatabaseName } from './test-database.guard';

function loadEnvironmentFileIfPresent(relativePath: string): void {
  const absolutePath = resolve(process.cwd(), relativePath);

  if (existsSync(absolutePath)) {
    loadEnvironmentFile({ path: absolutePath, override: true });
  }
}

export function loadTestEnvironment(): void {
  if (process.env['CI'] !== 'true') {
    loadEnvironmentFileIfPresent('.env');
    loadEnvironmentFileIfPresent('.env.test');

    if (!existsSync(resolve(process.cwd(), '.env.test'))) {
      loadEnvironmentFileIfPresent('.env.test.example');
    }
  }

  process.env['NODE_ENV'] = 'test';

  if (process.env['DB_NAME'] === undefined || process.env['DB_NAME'].trim().length === 0) {
    process.env['DB_NAME'] = DEFAULT_TEST_DATABASE_NAME;
  }

  assertSafeTestDatabaseName(process.env['DB_NAME']);
}
