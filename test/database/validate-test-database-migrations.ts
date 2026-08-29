import { loadTestEnvironment } from './load-test-environment';

async function run(): Promise<void> {
  loadTestEnvironment();

  const { prepareTestDatabase } = await import('./test-database.manager');
  await prepareTestDatabase();

  const { default: AppDataSource } = await import('../../src/database/data-source');
  const dataSource = AppDataSource;

  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }

  await dataSource.initialize();

  try {
    const hasPendingMigrations = (await dataSource.showMigrations()) === true;

    if (hasPendingMigrations) {
      process.stdout.write('Applying pending migrations to the test database...\n');
      await dataSource.runMigrations();
    } else {
      process.stdout.write('No migrations are pending on the test database.\n');
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration validation error.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
