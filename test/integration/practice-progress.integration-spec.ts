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
import { generateUuidV4 } from '../../src/database/uuid-v4.util';
import { QuestionType } from '../../src/modules/question-bank/enums/question-type.enum';
import { PracticeModule } from '../../src/modules/practice/practice.module';
import { PracticeService } from '../../src/modules/practice/services/practice.service';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';

describe('Practice progress integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let practiceService: PracticeService;
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
    const enrollmentService = moduleRef.get(EnrollmentService);
    const studentService = moduleRef.get(StudentService);
    const userAccountService = moduleRef.get(UserAccountService);

    practiceService = moduleRef.get(PracticeService);

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

  it('returns zero metrics when no practice activity exists', async () => {
    const progress = await practiceService.getEnrollmentProgress({
      enrollmentId,
      actorUserId: parentUserId,
    });

    expect(progress.standard.sessionsCompleted).toBe(0);
    expect(progress.standard.questionsAttempted).toBe(0);
    expect(progress.standard.firstAttemptAccuracy).toBe(0);
    expect(progress.standard.finalAccuracy).toBe(0);
    expect(progress.review.sessionsCompleted).toBe(0);
    expect(progress.lastPracticedAt).toBeNull();
  });

  it('derives standard metrics without double-counting retried questions', async () => {
    const created = await practiceService.createSession({
      enrollmentId,
      actorUserId: parentUserId,
      questionCount: 1,
      questionTypes: [QuestionType.SingleChoice],
      randomizeQuestions: false,
      randomizeOptions: false,
    });
    const question = created.questions[0];

    if (question === undefined) {
      throw new Error('Expected one practice question.');
    }

    const wrongOptionId = question.options[1]?.id ?? question.options[0]?.id;
    const correctOptionId = question.options[0]?.id;

    if (wrongOptionId === undefined || correctOptionId === undefined) {
      throw new Error('Expected answer options.');
    }

    await practiceService.submitAnswer({
      actorUserId: parentUserId,
      sessionId: created.id,
      sessionQuestionId: question.sessionQuestionId,
      clientAnswerId: generateUuidV4(),
      selectedOptionIds: [wrongOptionId],
    });
    await practiceService.submitAnswer({
      actorUserId: parentUserId,
      sessionId: created.id,
      sessionQuestionId: question.sessionQuestionId,
      clientAnswerId: generateUuidV4(),
      selectedOptionIds: [correctOptionId],
    });

    const progress = await practiceService.getEnrollmentProgress({
      enrollmentId,
      actorUserId: parentUserId,
    });

    expect(progress.standard.sessionsCompleted).toBe(1);
    expect(progress.standard.questionsAttempted).toBe(1);
    expect(progress.standard.firstAttemptCorrect).toBe(0);
    expect(progress.standard.finalCorrect).toBe(1);
    expect(progress.standard.firstAttemptAccuracy).toBe(0);
    expect(progress.standard.finalAccuracy).toBe(1);
    expect(progress.lastPracticedAt).not.toBeNull();
  });

  it('keeps review metrics separate from standard metrics', async () => {
    const created = await practiceService.createSession({
      enrollmentId,
      actorUserId: parentUserId,
      questionCount: 1,
      questionTypes: [QuestionType.SingleChoice],
      randomizeQuestions: false,
      randomizeOptions: false,
    });
    const question = created.questions[0];

    if (question === undefined) {
      throw new Error('Expected one practice question.');
    }

    const wrongOptionId = question.options[1]?.id ?? question.options[0]?.id;

    if (wrongOptionId === undefined) {
      throw new Error('Expected answer options.');
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await practiceService.submitAnswer({
        actorUserId: parentUserId,
        sessionId: created.id,
        sessionQuestionId: question.sessionQuestionId,
        clientAnswerId: generateUuidV4(),
        selectedOptionIds: [wrongOptionId],
      });
    }

    await practiceService.createReviewWrongSession({
      sourceSessionId: created.id,
      actorUserId: parentUserId,
      clientRequestId: generateUuidV4(),
    });

    const progress = await practiceService.getEnrollmentProgress({
      enrollmentId,
      actorUserId: parentUserId,
    });

    expect(progress.standard.sessionsCompleted).toBe(1);
    expect(progress.standard.finalCorrect).toBe(0);
    expect(progress.review.sessionsCompleted).toBe(0);
    expect(progress.review.questionsAttempted).toBe(0);
    expect(progress.review.uniqueQuestionVersionsReviewed).toBe(0);
  });
});
