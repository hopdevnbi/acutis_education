import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { CommunityDemoSeedModule } from '../src/database/seeds/community-demo-seed.module';
import { CommunityDemoSeedService } from '../src/database/seeds/community-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runCommunityDemoSeed(): Promise<void> {
  const logger = new Logger('SeedCommunityDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(
    `Starting Community (CMS, Announcements, Events, Notifications) demo seed against database "${databaseName}".`,
  );

  const applicationContext = await NestFactory.createApplicationContext(
    CommunityDemoSeedModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const seedService = applicationContext.get(CommunityDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Community seed complete: cms=${summary.cmsEntriesSeeded} announcements=${summary.announcementsSeeded} events=${summary.eventsSeeded} registrations=${summary.eventRegistrationsSeeded} notifications=${summary.notificationsSeeded} recipients=${summary.notificationRecipientsSeeded} devices=${summary.devicesRegistered}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runCommunityDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Community demo seed failed: ${message}`);
  process.exitCode = 1;
});
