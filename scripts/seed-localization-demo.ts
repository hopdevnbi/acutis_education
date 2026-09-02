import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { LocalizationDemoSeedModule } from '../src/database/seeds/localization-demo-seed.module';
import { LocalizationDemoSeedService } from '../src/database/seeds/localization-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runLocalizationDemoSeed(): Promise<void> {
  const logger = new Logger('SeedLocalizationDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting localization demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(
    LocalizationDemoSeedModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const seedService = applicationContext.get(LocalizationDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. resources=${String(summary.resourcesCreated)} created/${String(summary.resourcesExisting)} existing; revisions=${String(summary.revisionsCreated)} created/${String(summary.revisionsExisting)} existing; approvedQuestion=${summary.approvedQuestionCode}; machineTranslatedQuestion=${summary.machineTranslatedQuestionCode}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runLocalizationDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Localization demo seed failed: ${message}`);
  process.exitCode = 1;
});
