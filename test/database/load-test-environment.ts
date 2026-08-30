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

  if (
    process.env['JWT_ACCESS_SECRET'] === undefined ||
    process.env['JWT_ACCESS_SECRET'].trim().length === 0
  ) {
    process.env['JWT_ACCESS_SECRET'] = 'test-only-jwt-access-secret-32chars-minimum-value';
  }

  if (
    process.env['JWT_ACCESS_EXPIRES_IN'] === undefined ||
    process.env['JWT_ACCESS_EXPIRES_IN'].trim().length === 0
  ) {
    process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
  }

  if (
    process.env['JWT_REFRESH_HASH_SECRET'] === undefined ||
    process.env['JWT_REFRESH_HASH_SECRET'].trim().length === 0
  ) {
    process.env['JWT_REFRESH_HASH_SECRET'] = 'test-only-refresh-hash-secret-32chars-minimum-value';
  }

  if (
    process.env['JWT_REFRESH_EXPIRES_IN'] === undefined ||
    process.env['JWT_REFRESH_EXPIRES_IN'].trim().length === 0
  ) {
    process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
  }

  if (
    process.env['AUTH_LOGIN_THROTTLE_LIMIT'] === undefined ||
    process.env['AUTH_LOGIN_THROTTLE_LIMIT'].trim().length === 0
  ) {
    process.env['AUTH_LOGIN_THROTTLE_LIMIT'] = '1000';
  }

  if (
    process.env['AUTH_LOGIN_THROTTLE_TTL_MS'] === undefined ||
    process.env['AUTH_LOGIN_THROTTLE_TTL_MS'].trim().length === 0
  ) {
    process.env['AUTH_LOGIN_THROTTLE_TTL_MS'] = '60000';
  }

  if (
    process.env['AUTH_REFRESH_THROTTLE_LIMIT'] === undefined ||
    process.env['AUTH_REFRESH_THROTTLE_LIMIT'].trim().length === 0
  ) {
    process.env['AUTH_REFRESH_THROTTLE_LIMIT'] = '1000';
  }

  if (
    process.env['AUTH_REFRESH_THROTTLE_TTL_MS'] === undefined ||
    process.env['AUTH_REFRESH_THROTTLE_TTL_MS'].trim().length === 0
  ) {
    process.env['AUTH_REFRESH_THROTTLE_TTL_MS'] = '60000';
  }
}
