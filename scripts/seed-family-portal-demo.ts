import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { FamilyPortalDemoSeedModule } from '../src/database/seeds/family-portal-demo-seed.module';
import { FamilyPortalDemoSeedService } from '../src/database/seeds/family-portal-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runFamilyPortalDemoSeed(): Promise<void> {
  const logger = new Logger('SeedFamilyPortalDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting Family Portal demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(
    FamilyPortalDemoSeedModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const seedService = applicationContext.get(FamilyPortalDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. catechist=${summary.catechistEmail} parent=${summary.parentEmail} classId=${summary.learningProgress.classId} enrollmentId=${summary.learningProgress.enrollmentId} examAssignmentId=${summary.exam.examAssignmentId}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runFamilyPortalDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Family Portal demo seed failed: ${message}`);
  process.exitCode = 1;
});
