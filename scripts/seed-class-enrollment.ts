import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadCliDataSourceEnvironment } from '../src/database/load-cli-data-source-environment';
import { ClassEnrollmentSeedModule } from '../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../src/database/seeds/class-enrollment.seed.service';
import { assertSafeSeedEnvironment } from '../src/database/seeds/seed-environment.guard';

async function runClassEnrollmentSeed(): Promise<void> {
  const logger = new Logger('SeedClassEnrollmentScript');

  loadCliDataSourceEnvironment();
  const databaseName = assertSafeSeedEnvironment(process.env);

  logger.log(`Starting class/enrollment sample seed against database "${databaseName}".`);

  const applicationContext = await NestFactory.createApplicationContext(ClassEnrollmentSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = applicationContext.get(ClassEnrollmentSeedService);
    const summary = await seedService.run();

    logger.log(
      `Seed complete. parishMembership=${summary.parishMembershipCreated ? 'created' : summary.parishMembershipExisting ? 'existing' : 'unknown'}; classes=${String(summary.classesCreated)} created/${String(summary.classesExisting)} existing; students=${String(summary.studentsCreated)} created/${String(summary.studentsExisting)} existing; guardianLinks=${String(summary.guardianLinksCreated)} created/${String(summary.guardianLinksExisting)} existing; catechistAssignments=${String(summary.catechistAssignmentsCreated)} created/${String(summary.catechistAssignmentsExisting)} existing; enrollments=${String(summary.enrollmentsCreated)} created/${String(summary.enrollmentsExisting)} existing; transferHistory=${String(summary.transferHistoryEnsured)}.`,
    );
  } finally {
    await applicationContext.close();
  }
}

runClassEnrollmentSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Class/enrollment seed failed: ${message}`);
  process.exitCode = 1;
});
