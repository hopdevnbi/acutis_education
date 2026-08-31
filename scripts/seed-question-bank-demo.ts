import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { QuestionBankDemoSeedModule } from '../src/database/seeds/question-bank-demo-seed.module';
import { QuestionBankDemoSeedService } from '../src/database/seeds/question-bank-demo.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runQuestionBankDemoSeed(): Promise<void> {
  const logger = new Logger('SeedQuestionBankDemoScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting question bank demo seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(
    QuestionBankDemoSeedModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const seedService = applicationContext.get(QuestionBankDemoSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. tags=${String(summary.tagsCreated)} created/${String(summary.tagsExisting)} existing; questions=${String(summary.questionsCreated)} created/${String(summary.questionsExisting)} existing; published=${String(summary.questionsPublished)} new/${String(summary.questionsAlreadyPublished)} already; tagLinks=${String(summary.tagLinksCreated)}; curriculumLinks=${String(summary.curriculumLinksCreated)}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runQuestionBankDemoSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Question bank demo seed failed: ${message}`);
  process.exitCode = 1;
});
