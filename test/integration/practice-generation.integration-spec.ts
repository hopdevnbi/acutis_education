import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
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
import { QuestionBankDemoSeedModule } from '../../src/database/seeds/question-bank-demo-seed.module';
import { QuestionBankDemoSeedService } from '../../src/database/seeds/question-bank-demo.seed.service';
import { PracticeModule } from '../../src/modules/practice/practice.module';
import { PracticeService } from '../../src/modules/practice/services/practice.service';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';
import { PracticeSessionStatus } from '../../src/modules/practice/enums/practice-session-status.enum';

describe('Practice generation integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let practiceService: PracticeService;
  let enrollmentService: EnrollmentService;
  let studentService: StudentService;
  let userAccountService: UserAccountService;
  let parentUserId: string;
  let enrollmentId: string;

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
        QuestionBankDemoSeedModule,
        PracticeModule,
      ],
    }).compile();

    const authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    const curriculumDemoSeedService = moduleRef.get(CurriculumDemoSeedService);
    const questionBankDemoSeedService = moduleRef.get(QuestionBankDemoSeedService);

    practiceService = moduleRef.get(PracticeService);
    enrollmentService = moduleRef.get(EnrollmentService);
    studentService = moduleRef.get(StudentService);
    userAccountService = moduleRef.get(UserAccountService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();
    await questionBankDemoSeedService.run();

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
  });

  afterEach(async () => {
    await AppDataSource.query(
      `
      DELETE FROM practice_sessions
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

  it('creates a parent-linked practice session with pinned question versions', async () => {
    const snapshot = await practiceService.createSession({
      enrollmentId,
      actorUserId: parentUserId,
      questionCount: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
    });

    expect(snapshot.enrollmentId.toLowerCase()).toBe(enrollmentId.toLowerCase());
    expect(snapshot.status).toBe(PracticeSessionStatus.InProgress);
    expect(snapshot.questions).toHaveLength(1);
    expect(snapshot.questions[0]?.position).toBe(1);
    expect(snapshot.questions[0]?.attemptState.attemptCount).toBe(0);
    expect(snapshot.questions[0]?.prompt.length).toBeGreaterThan(0);
    expect(snapshot.questions[0]?.options.length).toBeGreaterThan(0);
  });

  it('replays the same session for duplicate clientRequestId', async () => {
    const clientRequestId = generateUuidV4();

    const first = await practiceService.createSession({
      enrollmentId,
      actorUserId: parentUserId,
      clientRequestId,
      questionCount: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
    });
    const second = await practiceService.createSession({
      enrollmentId,
      actorUserId: parentUserId,
      clientRequestId,
      questionCount: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
    });

    expect(second.id).toBe(first.id);
    expect(second.questions.map((question) => question.questionVersionId)).toEqual(
      first.questions.map((question) => question.questionVersionId),
    );
  });

  it('abandons an in-progress session idempotently', async () => {
    const created = await practiceService.createSession({
      enrollmentId,
      actorUserId: parentUserId,
      questionCount: 1,
    });

    const abandoned = await practiceService.abandonSession(parentUserId, created.id);
    const abandonedAgain = await practiceService.abandonSession(parentUserId, created.id);

    expect(abandoned.status).toBe(PracticeSessionStatus.Abandoned);
    expect(abandonedAgain.status).toBe(PracticeSessionStatus.Abandoned);
  });
});
