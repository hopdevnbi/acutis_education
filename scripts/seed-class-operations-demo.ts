import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { ClassOperationsDemoSeedModule } from '../src/database/seeds/class-operations-demo-seed.module';
import { ClassOperationsDemoSeedService } from '../src/database/seeds/class-operations-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runClassOperationsDemoSeed(): Promise<void> {
  const logger = new Logger('SeedClassOperationsDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting Class Operations demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(
    ClassOperationsDemoSeedModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const seedService = applicationContext.get(ClassOperationsDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. classId=${summary.classId} primaryEnrollment=${summary.primaryEnrollmentId} secondaryEnrollment=${summary.secondaryEnrollmentId} completed=${String(summary.completedCount)} scheduled=${summary.scheduledSessionId} cancelled=${summary.cancelledSessionId} sessionsCreated=${String(summary.sessionsCreated)} sessionsExisting=${String(summary.sessionsExisting)}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runClassOperationsDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Class Operations demo seed failed: ${message}`);
  process.exitCode = 1;
});
