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
import { PracticeSessionStatus } from '../../src/modules/practice/enums/practice-session-status.enum';
import { PracticeSessionType } from '../../src/modules/practice/enums/practice-session-type.enum';
import { PracticeService } from '../../src/modules/practice/services/practice.service';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { StudentService } from '../../src/modules/student/services/student.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';

describe('Practice answer and review integration (MSSQL)', () => {
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

  it('submits attempts with retry, auto-completes on correct answer, and exposes feedback', async () => {
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
      throw new Error('Expected at least one option.');
    }

    const wrongAttempt = await practiceService.submitAnswer({
      actorUserId: parentUserId,
      sessionId: created.id,
      sessionQuestionId: question.sessionQuestionId,
      clientAnswerId: generateUuidV4(),
      selectedOptionIds: [wrongOptionId],
    });

    expect(wrongAttempt.replayed).toBe(false);
    expect(wrongAttempt.isCorrect).toBe(false);
    expect(wrongAttempt.canRetry).toBe(true);
    expect(wrongAttempt.feedback).toBeNull();

    const correctOptionId = question.options[0]?.id;

    if (correctOptionId === undefined) {
      throw new Error('Expected first option.');
    }

    const correctAttempt = await practiceService.submitAnswer({
      actorUserId: parentUserId,
      sessionId: created.id,
      sessionQuestionId: question.sessionQuestionId,
      clientAnswerId: generateUuidV4(),
      selectedOptionIds: [correctOptionId],
    });

    expect(correctAttempt.isCorrect).toBe(true);
    expect(correctAttempt.questionFinalized).toBe(true);
    expect(correctAttempt.sessionCompleted).toBe(true);
    expect(correctAttempt.feedback).not.toBeNull();

    const completedSnapshot = await practiceService.getSession(parentUserId, created.id);
    expect(completedSnapshot.status).toBe(PracticeSessionStatus.Completed);
    expect(completedSnapshot.summary.sessionCompleted).toBe(true);
    expect(completedSnapshot.questions[0]?.attemptState.feedback).not.toBeNull();
  });

  it('creates review-wrong child session only for finally incorrect questions', async () => {
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
      throw new Error('Expected at least one option.');
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await practiceService.submitAnswer({
        actorUserId: parentUserId,
        sessionId: created.id,
        sessionQuestionId: question.sessionQuestionId,
        clientAnswerId: generateUuidV4(),
        selectedOptionIds: [wrongOptionId],
      });

      if (attempt < 2) {
        expect(result.feedback).toBeNull();
      } else {
        expect(result.questionFinalized).toBe(true);
        expect(result.sessionCompleted).toBe(true);
        expect(result.feedback).not.toBeNull();
      }
    }

    const reviewResult = await practiceService.createReviewWrongSession({
      sourceSessionId: created.id,
      actorUserId: parentUserId,
      clientRequestId: generateUuidV4(),
    });

    expect(reviewResult.replayed).toBe(false);
    expect(reviewResult.snapshot.sessionType).toBe(PracticeSessionType.ReviewWrong);
    expect(reviewResult.snapshot.questions).toHaveLength(1);
    expect(reviewResult.snapshot.questions[0]?.questionVersionId).toBe(question.questionVersionId);
  });

  it('replays answer submission for duplicate clientAnswerId', async () => {
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

    const clientAnswerId = generateUuidV4();
    const selectedOptionIds = [question.options[0]?.id ?? generateUuidV4()];

    const first = await practiceService.submitAnswer({
      actorUserId: parentUserId,
      sessionId: created.id,
      sessionQuestionId: question.sessionQuestionId,
      clientAnswerId,
      selectedOptionIds,
    });
    const second = await practiceService.submitAnswer({
      actorUserId: parentUserId,
      sessionId: created.id,
      sessionQuestionId: question.sessionQuestionId,
      clientAnswerId,
      selectedOptionIds,
    });

    expect(second.replayed).toBe(true);
    expect(second.attemptId).toBe(first.attemptId);
  });
});
