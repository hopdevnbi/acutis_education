import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { CurriculumDemoSeedModule } from '../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../src/database/seeds/curriculum-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runCurriculumDemoSeed(): Promise<void> {
  const logger = new Logger('SeedCurriculumDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting curriculum demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(CurriculumDemoSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = applicationContext.get(CurriculumDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. curriculum=${summary.curriculumCreated ? 'created' : summary.curriculumExisting ? 'existing' : 'unknown'}; draft=${summary.draftVersionCreated ? 'created' : summary.draftVersionExisting ? 'existing' : 'none'}; topics=${String(summary.topicsCreated)} created/${String(summary.topicsExisting)} existing; lessons=${String(summary.lessonsCreated)} created/${String(summary.lessonsExisting)} existing; contents=${String(summary.lessonContentsUpserted)} upserted; published=${String(summary.versionPublished || summary.versionAlreadyPublished)}; assignment=${summary.assignmentCreated ? 'created/updated' : summary.assignmentExisting ? 'existing' : 'unknown'}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runCurriculumDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Curriculum demo seed failed: ${message}`);
  process.exitCode = 1;
});
