import sql from 'mssql';

const REQUIRED_ENVIRONMENT_VARIABLES = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'] as const;

const DEFAULT_MAX_ATTEMPTS = 30;
const DEFAULT_RETRY_DELAY_MS = 2_000;
const CONNECTION_TIMEOUT_MS = 5_000;

function parsePositiveInteger(rawValue: string | undefined, fallback: number): number {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`Invalid numeric environment value: ${rawValue}`);
  }

  return parsedValue;
}

function parseBooleanEnvironmentVariable(
  rawValue: string | undefined,
  defaultValue: boolean,
): boolean {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return defaultValue;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  throw new Error(`Invalid boolean environment value: ${rawValue}`);
}

function readRequiredEnvironmentVariable(
  name: (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number],
): string {
  const rawValue = process.env[name]?.trim();

  if (rawValue === undefined || rawValue.length === 0) {
    throw new Error(`${name} is required for MSSQL readiness checks.`);
  }

  return rawValue;
}

function assertRequiredEnvironmentVariables(): void {
  for (const environmentVariableName of REQUIRED_ENVIRONMENT_VARIABLES) {
    readRequiredEnvironmentVariable(environmentVariableName);
  }
}

function buildConnectionConfig(): sql.config {
  assertRequiredEnvironmentVariables();
  const databasePort = parsePositiveInteger(process.env['DB_PORT'], 1433);

  return {
    server: readRequiredEnvironmentVariable('DB_HOST'),
    port: databasePort,
    user: readRequiredEnvironmentVariable('DB_USER'),
    password: readRequiredEnvironmentVariable('DB_PASSWORD'),
    database: 'master',
    options: {
      encrypt: parseBooleanEnvironmentVariable(process.env['DB_ENCRYPT'], true),
      trustServerCertificate: parseBooleanEnvironmentVariable(
        process.env['DB_TRUST_SERVER_CERTIFICATE'],
        true,
      ),
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    requestTimeout: CONNECTION_TIMEOUT_MS,
  };
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export async function waitForMssqlAvailability(
  options: {
    maxAttempts?: number;
    retryDelayMs?: number;
  } = {},
): Promise<void> {
  const maxAttempts =
    options.maxAttempts ??
    parsePositiveInteger(process.env['MSSQL_WAIT_MAX_ATTEMPTS'], DEFAULT_MAX_ATTEMPTS);
  const retryDelayMs =
    options.retryDelayMs ??
    parsePositiveInteger(process.env['MSSQL_WAIT_RETRY_DELAY_MS'], DEFAULT_RETRY_DELAY_MS);
  const connectionConfig = buildConnectionConfig();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let connectionPool: sql.ConnectionPool | undefined;

    try {
      connectionPool = new sql.ConnectionPool(connectionConfig);
      await connectionPool.connect();
      await connectionPool.request().query('SELECT 1 AS ready');
      process.stdout.write(`MSSQL is ready (attempt ${attempt}/${maxAttempts}).\n`);
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown MSSQL connection error.';

      if (attempt === maxAttempts) {
        throw new Error(`MSSQL did not become ready after ${maxAttempts} attempts: ${message}`);
      }

      process.stdout.write(`Waiting for MSSQL (${attempt}/${maxAttempts})...\n`);
      await sleep(retryDelayMs);
    } finally {
      if (connectionPool !== undefined) {
        await connectionPool.close();
      }
    }
  }
}

async function run(): Promise<void> {
  await waitForMssqlAvailability();
}

if (require.main === module) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'MSSQL readiness check failed.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
