import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { FamilyPortalDemoSeedModule } from '../../src/database/seeds/family-portal-demo-seed.module';
import {
  FAMILY_PORTAL_DEMO_CATECHIST_EMAIL,
  FAMILY_PORTAL_DEMO_PARENT_EMAIL,
} from '../../src/database/seeds/family-portal-demo.seed.constants';
import { FamilyPortalDemoSeedService } from '../../src/database/seeds/family-portal-demo.seed.service';
import { ClassModule } from '../../src/modules/class/class.module';
import { ClassCatechistAssignmentService } from '../../src/modules/class/services/class-catechist-assignment.service';
import { EnrollmentModule } from '../../src/modules/enrollment/enrollment.module';
import { EnrollmentQueryService } from '../../src/modules/enrollment/services/enrollment-query.service';
import { UsersModule } from '../../src/modules/users/users.module';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';

describe('FamilyPortalDemoSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let familyPortalDemoSeedService: FamilyPortalDemoSeedService;
  let userAccountService: UserAccountService;
  let classCatechistAssignmentService: ClassCatechistAssignmentService;
  let enrollmentQueryService: EnrollmentQueryService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [FamilyPortalDemoSeedModule, UsersModule, ClassModule, EnrollmentModule],
    }).compile();

    familyPortalDemoSeedService = moduleRef.get(FamilyPortalDemoSeedService);
    userAccountService = moduleRef.get(UserAccountService);
    classCatechistAssignmentService = moduleRef.get(ClassCatechistAssignmentService);
    enrollmentQueryService = moduleRef.get(EnrollmentQueryService);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('seeds a deterministic Family Portal demo scenario on first run', async () => {
    const summary = await familyPortalDemoSeedService.run();

    expect(summary.catechistEmail).toBe(FAMILY_PORTAL_DEMO_CATECHIST_EMAIL);
    expect(summary.parentEmail).toBe(FAMILY_PORTAL_DEMO_PARENT_EMAIL);
    expect(summary.learningProgress.classId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(summary.learningProgress.enrollmentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(summary.exam.examAssignmentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(summary.learningProgress.aggregateLessonsAssigned).toBeGreaterThan(0);

    const catechist = await userAccountService.findAccountSnapshotByEmail(
      FAMILY_PORTAL_DEMO_CATECHIST_EMAIL,
    );
    const parent = await userAccountService.findAccountSnapshotByEmail(
      FAMILY_PORTAL_DEMO_PARENT_EMAIL,
    );

    expect(catechist).not.toBeNull();
    expect(parent).not.toBeNull();

    if (catechist === null || parent === null) {
      throw new Error('Expected demo catechist and parent accounts after seed.');
    }

    const assignedClassIds = await classCatechistAssignmentService.listAssignedClassIds(
      catechist.id,
    );
    const linkedStudentIds = await enrollmentQueryService.listStudentIdsForGuardian(parent.id);

    expect(assignedClassIds.length).toBeGreaterThanOrEqual(2);
    expect(linkedStudentIds.length).toBeGreaterThanOrEqual(1);
  });

  it('is idempotent on second run without changing stable demo identifiers', async () => {
    const first = await familyPortalDemoSeedService.run();
    const second = await familyPortalDemoSeedService.run();

    expect(second.learningProgress.classId).toBe(first.learningProgress.classId);
    expect(second.learningProgress.enrollmentId).toBe(first.learningProgress.enrollmentId);
    expect(second.exam.examId).toBe(first.exam.examId);
    expect(second.exam.examAssignmentId).toBe(first.exam.examAssignmentId);
    expect(second.exam.examCreated).toBe(false);
    expect(second.exam.assignmentCreated).toBe(false);

    const catechist = await userAccountService.findAccountSnapshotByEmail(
      FAMILY_PORTAL_DEMO_CATECHIST_EMAIL,
    );
    const parent = await userAccountService.findAccountSnapshotByEmail(
      FAMILY_PORTAL_DEMO_PARENT_EMAIL,
    );

    expect(catechist).not.toBeNull();
    expect(parent).not.toBeNull();

    if (catechist === null || parent === null) {
      throw new Error('Expected demo catechist and parent accounts after seed.');
    }

    const assignedClassIds = await classCatechistAssignmentService.listAssignedClassIds(
      catechist.id,
    );
    const linkedStudentIds = await enrollmentQueryService.listStudentIdsForGuardian(parent.id);

    expect(assignedClassIds.length).toBeGreaterThanOrEqual(2);
    expect(linkedStudentIds.length).toBeGreaterThanOrEqual(1);
  });
});
