import sql from 'mssql';
import { buildDatabaseConfiguration } from '../../src/config/database.configuration';
import { MASTER_DATABASE_NAME } from './test-database.constants';
import {
  assertSafeTestDatabaseName,
  formatBracketedDatabaseIdentifier,
} from './test-database.guard';
import { loadTestEnvironment } from './load-test-environment';

export type TestDatabaseManagerOptions = {
  reset?: boolean;
};

function buildMasterConnectionConfig(
  databaseConfiguration: ReturnType<typeof buildDatabaseConfiguration>,
): sql.config {
  return {
    server: databaseConfiguration.host,
    port: databaseConfiguration.port,
    user: databaseConfiguration.username,
    password: databaseConfiguration.password,
    database: MASTER_DATABASE_NAME,
    options: {
      encrypt: databaseConfiguration.encrypt,
      trustServerCertificate: databaseConfiguration.trustServerCertificate,
    },
  };
}

async function databaseExists(
  connectionPool: sql.ConnectionPool,
  databaseName: string,
): Promise<boolean> {
  const queryResult = await connectionPool
    .request()
    .input('databaseName', sql.NVarChar, databaseName)
    .query('SELECT name FROM sys.databases WHERE name = @databaseName');

  return queryResult.recordset.length > 0;
}

async function dropTestDatabase(
  connectionPool: sql.ConnectionPool,
  databaseName: string,
): Promise<void> {
  const bracketedDatabaseName = formatBracketedDatabaseIdentifier(databaseName);

  await connectionPool.request().query(`
    IF EXISTS (SELECT name FROM sys.databases WHERE name = N'${databaseName}')
    BEGIN
      ALTER DATABASE ${bracketedDatabaseName} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      DROP DATABASE ${bracketedDatabaseName};
    END
  `);
}

async function createTestDatabase(
  connectionPool: sql.ConnectionPool,
  databaseName: string,
): Promise<void> {
  const bracketedDatabaseName = formatBracketedDatabaseIdentifier(databaseName);

  await connectionPool.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${databaseName}')
    BEGIN
      CREATE DATABASE ${bracketedDatabaseName};
    END
  `);
}

export async function prepareTestDatabase(
  options: TestDatabaseManagerOptions = {},
): Promise<string> {
  loadTestEnvironment();

  const databaseConfiguration = buildDatabaseConfiguration(process.env);
  assertSafeTestDatabaseName(databaseConfiguration.database);

  const connectionPool = await new sql.ConnectionPool(
    buildMasterConnectionConfig(databaseConfiguration),
  ).connect();

  try {
    if (options.reset === true) {
      await dropTestDatabase(connectionPool, databaseConfiguration.database);
    }

    await createTestDatabase(connectionPool, databaseConfiguration.database);

    const exists = await databaseExists(connectionPool, databaseConfiguration.database);

    if (!exists) {
      throw new Error(`Failed to prepare test database "${databaseConfiguration.database}".`);
    }

    return databaseConfiguration.database;
  } finally {
    await connectionPool.close();
  }
}
