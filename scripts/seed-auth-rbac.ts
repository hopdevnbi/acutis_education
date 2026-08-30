import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthRbacSeedModule } from '../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../src/database/seeds/auth-rbac.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';

async function runAuthRbacSeed(): Promise<void> {
  const logger = new Logger('SeedAuthRbacScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting Auth/RBAC seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(AuthRbacSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = applicationContext.get(AuthRbacSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. permissions=${String(summary.permissionsCreated)} created/${String(summary.permissionsExisting)} existing; roles=${String(summary.rolesCreated)} created/${String(summary.rolesExisting)} existing; users=${String(summary.usersCreated)} created/${String(summary.usersExisting)} existing.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runAuthRbacSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Auth/RBAC seed failed: ${message}`);
  process.exitCode = 1;
});
