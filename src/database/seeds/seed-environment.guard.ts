export const DEVELOPMENT_DATABASE_NAME = 'catechism_api' as const;

export const TEST_DATABASE_NAME = 'catechism_api_test' as const;

export const SEED_ALLOWED_DATABASE_NAMES = [DEVELOPMENT_DATABASE_NAME, TEST_DATABASE_NAME] as const;

export type SeedAllowedDatabaseName = (typeof SEED_ALLOWED_DATABASE_NAMES)[number];

export class UnsafeSeedEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeSeedEnvironmentError';
  }
}

export function assertSafeSeedEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): SeedAllowedDatabaseName {
  const nodeEnv = environment['NODE_ENV']?.trim().toLowerCase();

  if (nodeEnv === 'production') {
    throw new UnsafeSeedEnvironmentError(
      'Refusing to run Auth/RBAC seed in production environment.',
    );
  }

  const databaseName = environment['DB_NAME']?.trim();

  if (databaseName === undefined || databaseName.length === 0) {
    throw new UnsafeSeedEnvironmentError('DB_NAME is required for Auth/RBAC seed operations.');
  }

  const allowedDatabaseName = SEED_ALLOWED_DATABASE_NAMES.find(
    (candidate) => candidate === databaseName,
  );

  if (allowedDatabaseName === undefined) {
    throw new UnsafeSeedEnvironmentError(
      `Refusing to seed database "${databaseName}". Allowed databases: ${SEED_ALLOWED_DATABASE_NAMES.join(', ')}.`,
    );
  }

  return allowedDatabaseName;
}
