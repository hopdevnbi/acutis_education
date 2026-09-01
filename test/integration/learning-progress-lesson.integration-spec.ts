import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { normalizeUuid } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import { CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME } from '../../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../../src/database/seeds/curriculum-demo.seed.service';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import {
  AUTH_RBAC_SEED_USERS,
  AUTH_RBAC_SAMPLE_DOMAIN,
} from '../../src/database/seeds/auth-rbac.seed.constants';
import { ClassService } from '../../src/modules/class/services/class.service';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { EnrollmentStatus } from '../../src/modules/enrollment/enums/enrollment-status.enum';
import { LessonProgressStatus } from '../../src/modules/learning-progress/enums/lesson-progress-status.enum';
import { LearningProgressEnrollmentNotWritableError } from '../../src/modules/learning-progress/errors/learning-progress.errors';
import { LearningProgressModule } from '../../src/modules/learning-progress/learning-progress.module';
import { LearningProgressService } from '../../src/modules/learning-progress/services/learning-progress.service';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';

describe('Learning progress lesson integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let learningProgressService: LearningProgressService;
  let enrollmentService: EnrollmentService;
  let parentUserId: string;
  let enrollmentId: string;
  let canonicalLessonKey: string;
  let assignedVersionId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ApplicationConfigModule,
        DatabaseModule,
        AuthRbacSeedModule,
        ParishAcademicSeedModule,
        ClassEnrollmentSeedModule,
        CurriculumDemoSeedModule,
        LearningProgressModule,
      ],
    }).compile();

    const authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    const curriculumDemoSeedService = moduleRef.get(CurriculumDemoSeedService);
    const userAccountService = moduleRef.get(UserAccountService);
    const studentService = moduleRef.get(StudentService);
    const classService = moduleRef.get(ClassService);
    const curriculumService = moduleRef.get(CurriculumService);

    learningProgressService = moduleRef.get(LearningProgressService);
    enrollmentService = moduleRef.get(EnrollmentService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();

    const parentEmail =
      AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARENT')?.email ??
      `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`;
    const parentAccount = await userAccountService.findAccountSnapshotByEmail(parentEmail);

    if (parentAccount === null) {
      throw new Error(`Expected seeded parent account for ${parentEmail}.`);
    }

    parentUserId = parentAccount.id;

    const alphaStudent = (
      await studentService.listStudents({
        page: 1,
        limit: 5,
        sortBy: 'fullName',
        sort: 'ASC',
        search: CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
      })
    ).items.find((item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);

    if (alphaStudent === undefined) {
      throw new Error('Expected demo student alpha to exist.');
    }

    const enrollments = await enrollmentService.listEnrollmentsByStudent(alphaStudent.id, {
      page: 1,
      limit: 5,
      sortBy: 'enrolledAt',
      sort: 'DESC',
    });
    const activeEnrollment = enrollments.items[0];

    if (activeEnrollment === undefined) {
      throw new Error('Expected active enrollment for demo student alpha.');
    }

    enrollmentId = activeEnrollment.id;

    const classSnapshot = await classService.getClassById(activeEnrollment.classId);
    const assignedVersion = await curriculumService.getPublishedVersionForAssignment(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );
    assignedVersionId = normalizeUuid(assignedVersion.id);

    const versionTree = await curriculumService.getVersionTree(assignedVersion.id);
    const firstLesson = versionTree.topics[0]?.lessons[0];

    if (firstLesson === undefined) {
      throw new Error('Expected assigned curriculum tree to contain at least one lesson.');
    }

    canonicalLessonKey = firstLesson.canonicalLessonKey;
  });

  afterEach(async () => {
    await AppDataSource.query(
      `
      DELETE FROM lesson_progress
      WHERE enrollment_id = @0
    `,
      [enrollmentId],
    );
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('returns NOT_STARTED when no lesson progress row exists', async () => {
    const snapshot = await learningProgressService.getLessonProgress({
      enrollmentId,
      canonicalLessonKey,
    });

    expect(snapshot.status).toBe(LessonProgressStatus.NotStarted);
    expect(snapshot.startedAt).toBeNull();
    expect(snapshot.completedAt).toBeNull();
  });

  it('creates IN_PROGRESS and then COMPLETED with stable timestamps', async () => {
    const inProgress = await learningProgressService.setLessonProgress({
      enrollmentId,
      canonicalLessonKey,
      targetStatus: LessonProgressStatus.InProgress,
      actorUserId: parentUserId,
    });

    expect(inProgress.status).toBe(LessonProgressStatus.InProgress);
    expect(inProgress.assignedCurriculumVersionId).toBe(assignedVersionId);
    expect(inProgress.startedAt).not.toBeNull();

    const completed = await learningProgressService.setLessonProgress({
      enrollmentId,
      canonicalLessonKey,
      targetStatus: LessonProgressStatus.Completed,
      actorUserId: parentUserId,
    });

    expect(completed.status).toBe(LessonProgressStatus.Completed);
    expect(completed.completedAt).not.toBeNull();
    expect(completed.startedAt?.toISOString()).toBe(inProgress.startedAt?.toISOString());

    const replayed = await learningProgressService.setLessonProgress({
      enrollmentId,
      canonicalLessonKey,
      targetStatus: LessonProgressStatus.Completed,
      actorUserId: parentUserId,
    });

    expect(replayed.completedAt?.toISOString()).toBe(completed.completedAt?.toISOString());

    const rows = await AppDataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM lesson_progress WHERE enrollment_id = @0`,
      [enrollmentId],
    );

    expect(Number(rows[0]?.count)).toBe(1);
  });

  it('allows direct NOT_STARTED to COMPLETED on first write', async () => {
    const completed = await learningProgressService.setLessonProgress({
      enrollmentId,
      canonicalLessonKey,
      targetStatus: LessonProgressStatus.Completed,
      actorUserId: parentUserId,
    });

    expect(completed.status).toBe(LessonProgressStatus.Completed);
    expect(completed.startedAt).not.toBeNull();
    expect(completed.completedAt).not.toBeNull();
  });

  it('denies writes for inactive enrollments', async () => {
    await enrollmentService.updateEnrollmentStatus(enrollmentId, EnrollmentStatus.Completed);

    await expect(
      learningProgressService.setLessonProgress({
        enrollmentId,
        canonicalLessonKey,
        targetStatus: LessonProgressStatus.InProgress,
        actorUserId: parentUserId,
      }),
    ).rejects.toBeInstanceOf(LearningProgressEnrollmentNotWritableError);
  });
});
