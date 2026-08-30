import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { ParishAcademicSeedModule } from '../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../src/database/seeds/parish-academic.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runParishAcademicSeed(): Promise<void> {
  const logger = new Logger('SeedParishAcademicScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting parish/academic sample seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(ParishAcademicSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = applicationContext.get(ParishAcademicSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. parish=${summary.parishCreated ? 'created' : summary.parishExisting ? 'existing' : 'unknown'}; academicYear=${summary.academicYearCreated ? 'created' : summary.academicYearExisting ? 'existing' : 'unknown'}; activated=${String(summary.academicYearActivated)}; levels=${String(summary.catechismLevelsCreated)} created/${String(summary.catechismLevelsExisting)} existing.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runParishAcademicSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Parish/academic seed failed: ${message}`);
  process.exitCode = 1;
});
