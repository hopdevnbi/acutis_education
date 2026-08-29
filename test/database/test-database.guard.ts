import {
  DEVELOPMENT_DATABASE_NAME,
  TEST_DATABASE_NAME_PATTERN,
  TEST_DATABASE_NAME_SUFFIX,
} from './test-database.constants';

export class UnsafeTestDatabaseNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeTestDatabaseNameError';
  }
}

export function assertSafeTestDatabaseName(databaseName: string): void {
  const normalizedName = databaseName.trim();

  if (normalizedName.length === 0) {
    throw new UnsafeTestDatabaseNameError('Database name is required for test operations.');
  }

  if (normalizedName === DEVELOPMENT_DATABASE_NAME) {
    throw new UnsafeTestDatabaseNameError(
      `Refusing to run destructive test operations against the development database "${DEVELOPMENT_DATABASE_NAME}".`,
    );
  }

  if (!normalizedName.endsWith(TEST_DATABASE_NAME_SUFFIX)) {
    throw new UnsafeTestDatabaseNameError(
      `Test database name must end with "${TEST_DATABASE_NAME_SUFFIX}". Received "${normalizedName}".`,
    );
  }

  if (!TEST_DATABASE_NAME_PATTERN.test(normalizedName)) {
    throw new UnsafeTestDatabaseNameError(
      `Test database name "${normalizedName}" does not match the allowed pattern ${TEST_DATABASE_NAME_PATTERN.toString()}.`,
    );
  }
}

export function formatBracketedDatabaseIdentifier(databaseName: string): string {
  assertSafeTestDatabaseName(databaseName);
  return `[${databaseName.replace(/]/g, ']]')}]`;
}
