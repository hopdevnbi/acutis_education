import { prepareTestDatabase, type TestDatabaseManagerOptions } from './test-database.manager';

function parseResetFlag(processArguments: string[]): TestDatabaseManagerOptions {
  return {
    reset: processArguments.includes('--reset'),
  };
}

async function run(): Promise<void> {
  const preparedDatabaseName = await prepareTestDatabase(parseResetFlag(process.argv.slice(2)));
  process.stdout.write(`Test database ready: ${preparedDatabaseName}\n`);
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown test database preparation error.';
  process.stderr.write(`${message}\n`);
  process.stderr.write(
    'Ensure the local MSSQL Docker stack is running and DB credentials are configured in .env / .env.test.\n',
  );
  process.exitCode = 1;
});
