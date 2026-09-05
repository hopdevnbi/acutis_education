import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { GamificationDemoSeedModule } from '../src/database/seeds/gamification-demo-seed.module';
import { GamificationDemoSeedService } from '../src/database/seeds/gamification-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runGamificationDemoSeed(): Promise<void> {
  const logger = new Logger('SeedGamificationDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting Gamification + Faith Journey demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(
    GamificationDemoSeedModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const seedService = applicationContext.get(GamificationDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. studentId=${summary.studentId} enrollmentId=${summary.enrollmentId} rulesCreated=${String(summary.rulesCreated)} badgesCreated=${String(summary.badgesCreated)} milestonesCreated=${String(summary.milestonesCreated)} missionsCreated=${String(summary.missionsCreated)} eventsProcessed=${String(summary.eventsProcessed)}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runGamificationDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Gamification demo seed failed: ${message}`);
  process.exitCode = 1;
});
