import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { LocalizationService } from '../src/modules/localization/services/localization.service';
import { LocalizationProcessJobsModule } from './localization-process-jobs.module';

function parseBatchSize(rawValue: string | undefined): number | undefined {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Batch size must be a positive integer.');
  }

  return parsed;
}

async function runLocalizationProcessJobs(): Promise<void> {
  const logger = new Logger('LocalizationProcessJobsScript');

  loadCliDataSourceEnvironment();

  const batchSize = parseBatchSize(process.env['TRANSLATION_JOB_BATCH_SIZE']);

  const applicationContext = await NestFactory.createApplicationContext(
    LocalizationProcessJobsModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const localizationService = applicationContext.get(LocalizationService);
    const summary = await localizationService.processTranslationJobs(batchSize);

    logger.log(
      `Translation job processing complete. claimed=${String(summary.claimedCount)} succeeded=${String(summary.succeededCount)} failed=${String(summary.failedCount)} dead=${String(summary.deadCount)}`,
    );
  } finally {
    await applicationContext.close();
  }
}

runLocalizationProcessJobs().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown localization job failure.';
  console.error(`Localization job processing failed: ${message}`);
  process.exitCode = 1;
});
