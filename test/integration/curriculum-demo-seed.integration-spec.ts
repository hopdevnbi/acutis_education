import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import { ClassEnrollmentSeedModule } from '../../src/database/seeds/class-enrollment-seed.module';
import { ClassEnrollmentSeedService } from '../../src/database/seeds/class-enrollment.seed.service';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
} from '../../src/database/seeds/class-enrollment.seed.constants';
import { CurriculumDemoSeedModule } from '../../src/database/seeds/curriculum-demo-seed.module';
import {
  CURRICULUM_DEMO_CURRICULUM_CODE,
  CURRICULUM_DEMO_TOPICS,
} from '../../src/database/seeds/curriculum-demo.seed.constants';
import {
  CurriculumDemoSeedPrerequisiteError,
  CurriculumDemoSeedService,
} from '../../src/database/seeds/curriculum-demo.seed.service';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import {
  PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
} from '../../src/database/seeds/parish-academic.seed.constants';
import { ClassService } from '../../src/modules/class/services/class.service';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { LearningContentService } from '../../src/modules/learning-content/services/learning-content.service';
import { EnrollmentService } from '../../src/modules/enrollment/services/enrollment.service';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { StudentService } from '../../src/modules/student/services/student.service';
import { deleteExamEngineRowsForParishCode } from './helpers/delete-exam-engine-rows-for-parish-code.util';

describe('CurriculumDemoSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let authRbacSeedService: AuthRbacSeedService;
  let parishAcademicSeedService: ParishAcademicSeedService;
  let classEnrollmentSeedService: ClassEnrollmentSeedService;
  let curriculumDemoSeedService: CurriculumDemoSeedService;
  let parishService: ParishService;
  let classService: ClassService;
  let studentService: StudentService;
  let enrollmentService: EnrollmentService;
  let curriculumService: CurriculumService;
  let learningContentService: LearningContentService;

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
      ],
    }).compile();

    authRbacSeedService = moduleRef.get(AuthRbacSeedService);
    parishAcademicSeedService = moduleRef.get(ParishAcademicSeedService);
    classEnrollmentSeedService = moduleRef.get(ClassEnrollmentSeedService);
    curriculumDemoSeedService = moduleRef.get(CurriculumDemoSeedService);
    parishService = moduleRef.get(ParishService);
    classService = moduleRef.get(ClassService);
    studentService = moduleRef.get(StudentService);
    enrollmentService = moduleRef.get(EnrollmentService);
    curriculumService = moduleRef.get(CurriculumService);
    learningContentService = moduleRef.get(LearningContentService);

    await authRbacSeedService.run();
  });

  afterEach(async () => {
    await deleteExamEngineRowsForParishCode(AppDataSource, PARISH_ACADEMIC_SAMPLE_PARISH_CODE);
    await AppDataSource.query(`
      DELETE FROM curriculum_assignments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      UPDATE curriculums
      SET current_published_version_id = NULL
      WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
    `);
    await AppDataSource.query(`
      DELETE FROM question_curriculum_links
      WHERE authoring_curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM lesson_contents
      WHERE lesson_id IN (
        SELECT l.id FROM lessons l
        INNER JOIN topics t ON t.id = l.topic_id
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM lessons
      WHERE topic_id IN (
        SELECT t.id FROM topics t
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM topics
      WHERE curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM curriculum_versions
      WHERE curriculum_id IN (
        SELECT id FROM curriculums WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM curriculums
      WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('refuses to run when parish-academic prerequisites are missing', async () => {
    await deleteExamEngineRowsForParishCode(AppDataSource, PARISH_ACADEMIC_SAMPLE_PARISH_CODE);
    await AppDataSource.query(`
      DELETE FROM curriculum_assignments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      UPDATE curriculums
      SET current_published_version_id = NULL
      WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
    `);
    await AppDataSource.query(`
      DELETE FROM question_curriculum_links
      WHERE authoring_curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM lesson_contents
      WHERE lesson_id IN (
        SELECT l.id FROM lessons l
        INNER JOIN topics t ON t.id = l.topic_id
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM lessons
      WHERE topic_id IN (
        SELECT t.id FROM topics t
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM topics
      WHERE curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM curriculum_versions
      WHERE curriculum_id IN (
        SELECT id FROM curriculums WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM curriculums
      WHERE code = '${CURRICULUM_DEMO_CURRICULUM_CODE}'
    `);
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE class_id IN (
        SELECT id FROM classes WHERE code IN ('demo-class-a', 'demo-class-b')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (
        SELECT id FROM classes WHERE code IN ('demo-class-a', 'demo-class-b')
      )
    `);
    await AppDataSource.query(`
      DELETE FROM classes
      WHERE code IN ('demo-class-a', 'demo-class-b')
    `);
    await AppDataSource.query(`
      DELETE FROM catechism_levels
      WHERE code LIKE 'demo-level-%'
    `);
    await AppDataSource.query(`
      DELETE FROM academic_years
      WHERE name = '${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME}'
    `);
    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE parish_id IN (
        SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM question_correct_options
      WHERE question_version_id IN (
        SELECT qv.id FROM question_versions qv
        INNER JOIN questions q ON q.id = qv.question_id
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM question_options
      WHERE question_version_id IN (
        SELECT qv.id FROM question_versions qv
        INNER JOIN questions q ON q.id = qv.question_id
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM question_tag_links
      WHERE question_id IN (
        SELECT q.id FROM questions q
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM question_curriculum_links
      WHERE question_id IN (
        SELECT q.id FROM questions q
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
      )
    `);
    await AppDataSource.query(`
      UPDATE questions
      SET current_published_version_id = NULL
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM question_versions
      WHERE question_id IN (
        SELECT q.id FROM questions q
        INNER JOIN parishes p ON p.id = q.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM questions
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM question_tags
      WHERE parish_id IN (SELECT id FROM parishes WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}')
    `);
    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
    `);

    await expect(curriculumDemoSeedService.run()).rejects.toBeInstanceOf(
      CurriculumDemoSeedPrerequisiteError,
    );
  });

  it('creates published demo curriculum with assignment and readable published tree on first run', async () => {
    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();

    const firstSummary = await curriculumDemoSeedService.run();

    expect(firstSummary.curriculumCreated).toBe(true);
    expect(firstSummary.draftVersionCreated).toBe(true);
    expect(firstSummary.topicsCreated).toBe(CURRICULUM_DEMO_TOPICS.length);
    expect(firstSummary.lessonsCreated).toBe(
      CURRICULUM_DEMO_TOPICS.reduce((total, topic) => total + topic.lessons.length, 0),
    );
    expect(firstSummary.lessonContentsUpserted).toBe(
      CURRICULUM_DEMO_TOPICS.reduce((total, topic) => total + topic.lessons.length, 0),
    );
    expect(firstSummary.versionPublished).toBe(true);
    expect(firstSummary.assignmentCreated).toBe(true);

    const parishList = await parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const parish = parishList.items.find(
      (item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    );
    expect(parish).toBeDefined();

    const curriculumList = await curriculumService.listCurriculaByParish(parish!.id, {
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: CURRICULUM_DEMO_CURRICULUM_CODE,
    });
    const curriculum = curriculumList.items.find(
      (item) => item.code === CURRICULUM_DEMO_CURRICULUM_CODE,
    );
    expect(curriculum).toBeDefined();
    expect(curriculum!.currentPublishedVersionId).not.toBeNull();

    const classList = await classService.listClassesByParish(parish!.id, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
    });
    const classA = classList.items.find((item) => item.code === CLASS_ENROLLMENT_DEMO_CLASS_A_CODE);
    expect(classA).toBeDefined();

    const assignment = await curriculumService.getCurriculumAssignment(
      parish!.id,
      classA!.academicYearId,
      classA!.catechismLevelId,
    );
    expect(assignment.curriculumVersionId).toBe(curriculum!.currentPublishedVersionId);

    const tree = await curriculumService.getVersionTree(assignment.curriculumVersionId);
    expect(tree.topics.length).toBe(CURRICULUM_DEMO_TOPICS.length);
    expect(tree.topics[0]?.lessons.length).toBeGreaterThan(0);

    const firstLessonId = tree.topics[0]?.lessons[0]?.id;
    expect(firstLessonId).toBeDefined();

    if (firstLessonId === undefined) {
      throw new Error('Expected seeded lesson id.');
    }

    const content = await learningContentService.getLessonContent(firstLessonId);
    expect(content.contentHash).not.toBeNull();
    expect(content.contentHash?.length).toBeGreaterThan(0);

    const alphaStudent = (
      await studentService.listStudents({
        page: 1,
        limit: 5,
        sortBy: 'fullName',
        sort: 'ASC',
        search: CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
      })
    ).items.find((item) => item.fullName === CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);
    expect(alphaStudent).toBeDefined();

    const enrollments = await enrollmentService.listEnrollmentsByStudent(alphaStudent!.id, {
      page: 1,
      limit: 5,
      sortBy: 'enrolledAt',
      sort: 'DESC',
    });
    const activeEnrollment = enrollments.items.find((item) => item.classId === classA!.id);
    expect(activeEnrollment).toBeDefined();
  });

  it('is idempotent on second run', async () => {
    await authRbacSeedService.run();
    await parishAcademicSeedService.run();
    await classEnrollmentSeedService.run();
    await curriculumDemoSeedService.run();

    const secondSummary = await curriculumDemoSeedService.run();

    expect(secondSummary.curriculumExisting).toBe(true);
    expect(secondSummary.versionAlreadyPublished).toBe(true);
    expect(secondSummary.topicsCreated).toBe(0);
    expect(secondSummary.lessonsCreated).toBe(0);
    expect(secondSummary.assignmentExisting).toBe(true);
  });
});
