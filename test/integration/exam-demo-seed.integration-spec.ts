import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import { CurriculumDemoSeedModule } from '../../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../../src/database/seeds/curriculum-demo.seed.service';
import { ExamDemoSeedModule } from '../../src/database/seeds/exam-demo-seed.module';
import { EXAM_DEMO_CODE } from '../../src/database/seeds/exam-demo.seed.constants';
import { ExamDemoSeedService } from '../../src/database/seeds/exam-demo.seed.service';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../../src/database/seeds/parish-academic.seed.constants';
import { QuestionBankDemoSeedModule } from '../../src/database/seeds/question-bank-demo-seed.module';
import { QuestionBankDemoSeedService } from '../../src/database/seeds/question-bank-demo.seed.service';
import { ExamVersionStatus } from '../../src/modules/exam/enums/exam-version-status.enum';
import { ExamService } from '../../src/modules/exam/services/exam.service';
import { deleteExamEngineRowsForParishCode } from './helpers/delete-exam-engine-rows-for-parish-code.util';

describe('ExamDemoSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let examDemoSeedService: ExamDemoSeedService;
  let examService: ExamService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        AuthRbacSeedModule,
        ParishAcademicSeedModule,
        ClassEnrollmentSeedModule,
        CurriculumDemoSeedModule,
        QuestionBankDemoSeedModule,
        ExamDemoSeedModule,
      ],
    }).compile();

    const authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    const curriculumDemoSeedService = moduleRef.get(CurriculumDemoSeedService);
    const questionBankDemoSeedService = moduleRef.get(QuestionBankDemoSeedService);

    examDemoSeedService = moduleRef.get(ExamDemoSeedService);
    examService = moduleRef.get(ExamService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();
    await questionBankDemoSeedService.run();
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  async function cleanupExamDemoState(): Promise<void> {
    await deleteExamEngineRowsForParishCode(
      AppDataSource,
      PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
      EXAM_DEMO_CODE,
    );
  }

  it('creates demo exam, published version, and open assignment', async () => {
    await cleanupExamDemoState();

    const summary = await examDemoSeedService.run();

    expect(summary.examCreated).toBe(true);
    expect(summary.versionCreated).toBe(true);
    expect(summary.versionPublished).toBe(true);
    expect(summary.assignmentCreated).toBe(true);

    const versions = await examService.listVersionsByExam(summary.examId, {});
    const published = versions.find((version) => version.status === ExamVersionStatus.Published);

    expect(published).toBeDefined();
    expect(summary.examAssignmentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('is idempotent on second run', async () => {
    const first = await examDemoSeedService.run();
    const second = await examDemoSeedService.run();

    expect(second.examCreated).toBe(false);
    expect(second.versionCreated).toBe(false);
    expect(second.versionPublished).toBe(false);
    expect(second.assignmentCreated).toBe(false);
    expect(second.examId).toBe(first.examId);
    expect(second.examVersionId).toBe(first.examVersionId);
    expect(second.examAssignmentId).toBe(first.examAssignmentId);
  });
});
