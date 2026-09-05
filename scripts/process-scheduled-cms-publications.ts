import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { CmsService } from '../src/modules/cms/cms.service';
import { ProcessScheduledCmsPublicationsModule } from './process-scheduled-cms-publications.module';

async function runScheduledCmsPublications(): Promise<void> {
  const logger = new Logger('ProcessScheduledCmsPublicationsScript');

  loadCliDataSourceEnvironment();

  const applicationContext = await NestFactory.createApplicationContext(
    ProcessScheduledCmsPublicationsModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const cmsService = applicationContext.get(CmsService);
    const result = await cmsService.publishDueEntries();

    logger.log(
      `Scheduled CMS publication processing complete. processedCount=${result.processedCount} entries=[${result.publishedEntryIds.join(', ')}]`,
    );
  } finally {
    await applicationContext.close();
  }
}

runScheduledCmsPublications().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown scheduled CMS publication failure.';
  console.error(`Scheduled CMS publication failed: ${message}`);
  process.exitCode = 1;
});
