import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import { CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME } from '../../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../../src/database/seeds/curriculum-demo-seed.module';
import { CurriculumDemoSeedService } from '../../src/database/seeds/curriculum-demo.seed.service';
import { LearningProgressDemoSeedModule } from '../../src/database/seeds/learning-progress-demo-seed.module';
import { LearningProgressDemoSeedService } from '../../src/database/seeds/learning-progress-demo.seed.service';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from '../../src/database/seeds/parish-academic.seed.constants';
import { LessonProgressStatus } from '../../src/modules/learning-progress/enums/lesson-progress-status.enum';
import { LearningProgressService } from '../../src/modules/learning-progress/services/learning-progress.service';

describe('LearningProgressDemoSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let learningProgressDemoSeedService: LearningProgressDemoSeedService;
  let learningProgressService: LearningProgressService;

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
        LearningProgressDemoSeedModule,
      ],
    }).compile();

    const authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    const parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    const classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    const curriculumDemoSeedService = moduleRef.get(CurriculumDemoSeedService);

    learningProgressDemoSeedService = moduleRef.get(LearningProgressDemoSeedService);
    learningProgressService = moduleRef.get(LearningProgressService);

    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();

    await AppDataSource.query(`
      DELETE FROM lesson_progress
      WHERE enrollment_id IN (
        SELECT e.id
        FROM enrollments e
        INNER JOIN students s ON s.id = e.student_id
        INNER JOIN parishes p ON p.id = e.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
          AND s.full_name = N'${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}'
      )
    `);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM lesson_progress
      WHERE enrollment_id IN (
        SELECT e.id
        FROM enrollments e
        INNER JOIN students s ON s.id = e.student_id
        INNER JOIN parishes p ON p.id = e.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
          AND s.full_name = N'${CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME}'
      )
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates demo IN_PROGRESS and COMPLETED lesson states on first run', async () => {
    const summary = await learningProgressDemoSeedService.run();

    expect(summary.inProgressWritten).toBe(true);
    expect(summary.completedWritten).toBe(true);
    expect(summary.aggregateLessonsStarted).toBeGreaterThanOrEqual(2);
    expect(summary.aggregateLessonsCompleted).toBeGreaterThanOrEqual(1);

    const rows = await AppDataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM lesson_progress WHERE enrollment_id = @0`,
      [summary.enrollmentId],
    );

    expect(Number(rows[0]?.count)).toBe(2);
  });

  it('remains idempotent on second run without duplicate rows', async () => {
    const first = await learningProgressDemoSeedService.run();
    const second = await learningProgressDemoSeedService.run();

    expect(second.enrollmentId).toBe(first.enrollmentId);
    expect(second.inProgressLessonKey).toBe(first.inProgressLessonKey);
    expect(second.completedLessonKey).toBe(first.completedLessonKey);

    const rows = await AppDataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM lesson_progress WHERE enrollment_id = @0`,
      [first.enrollmentId],
    );

    expect(Number(rows[0]?.count)).toBe(2);

    const inProgress = await learningProgressService.getLessonProgress({
      enrollmentId: first.enrollmentId,
      canonicalLessonKey: first.inProgressLessonKey,
    });
    const completed = await learningProgressService.getLessonProgress({
      enrollmentId: first.enrollmentId,
      canonicalLessonKey: first.completedLessonKey,
    });

    expect(inProgress.status).toBe(LessonProgressStatus.InProgress);
    expect(completed.status).toBe(LessonProgressStatus.Completed);
  });
});
