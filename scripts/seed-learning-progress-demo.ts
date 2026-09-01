import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { LearningProgressDemoSeedModule } from '../src/database/seeds/learning-progress-demo-seed.module';
import { LearningProgressDemoSeedService } from '../src/database/seeds/learning-progress-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runLearningProgressDemoSeed(): Promise<void> {
  const logger = new Logger('SeedLearningProgressDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting learning progress demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(
    LearningProgressDemoSeedModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const seedService = applicationContext.get(LearningProgressDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. enrollment=${summary.enrollmentId}; class=${summary.classId}; curriculum=${summary.curriculumId}; inProgress=${summary.inProgressLessonKey}; completed=${summary.completedLessonKey}; aggregate started=${String(summary.aggregateLessonsStarted)} completed=${String(summary.aggregateLessonsCompleted)}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runLearningProgressDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Learning progress demo seed failed: ${message}`);
  process.exitCode = 1;
});
