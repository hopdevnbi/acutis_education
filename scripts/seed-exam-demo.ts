import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { ExamDemoSeedModule } from '../src/database/seeds/exam-demo-seed.module';
import { ExamDemoSeedService } from '../src/database/seeds/exam-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runExamDemoSeed(): Promise<void> {
  const logger = new Logger('SeedExamDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting exam demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(ExamDemoSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = applicationContext.get(ExamDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. examCreated=${String(summary.examCreated)} versionCreated=${String(summary.versionCreated)} versionPublished=${String(summary.versionPublished)} assignmentCreated=${String(summary.assignmentCreated)} assignmentWindowRefreshed=${String(summary.assignmentWindowRefreshed)} enrollmentId=${summary.enrollmentId} assignmentId=${summary.examAssignmentId}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runExamDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Exam demo seed failed: ${message}`);
  process.exitCode = 1;
});
