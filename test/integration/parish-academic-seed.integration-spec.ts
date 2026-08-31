import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { ParishAcademicSeedModule } from '../../src/database/seeds/parish-academic-seed.module';
import { ParishAcademicSeedService } from '../../src/database/seeds/parish-academic.seed.service';
import {
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
  PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
  PARISH_ACADEMIC_SEED_LEVELS,
} from '../../src/database/seeds/parish-academic.seed.constants';
import { CURRICULUM_DEMO_CURRICULUM_CODE } from '../../src/database/seeds/curriculum-demo.seed.constants';
import {
  assertSafeSeedEnvironment,
  UnsafeSeedEnvironmentError,
} from '../../src/database/seeds/seed-environment.guard';
import { AcademicYearStatus } from '../../src/modules/academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { ParishService } from '../../src/modules/parish/services/parish.service';

describe('ParishAcademicSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let seedService: ParishAcademicSeedService;
  let parishService: ParishService;
  let academicYearService: AcademicYearService;
  let catechismLevelService: CatechismLevelService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ParishAcademicSeedModule],
    }).compile();

    seedService = moduleRef.get(ParishAcademicSeedService);
    parishService = moduleRef.get(ParishService);
    academicYearService = moduleRef.get(AcademicYearService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM practice_sessions
      WHERE enrollment_id IN (
        SELECT e.id FROM enrollments e
        INNER JOIN parishes p ON p.id = e.parish_id
        WHERE p.code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
      )
    `);
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
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates demo parish, active academic year, and catechism levels on first run', async () => {
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE class_id IN (SELECT id FROM classes WHERE code IN ('demo-class-a', 'demo-class-b'))
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code IN ('demo-class-a', 'demo-class-b'))
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
      DELETE FROM parishes
      WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
    `);

    const summary = await seedService.run();

    expect(summary.parishCreated).toBe(true);
    expect(summary.academicYearCreated).toBe(true);
    expect(summary.catechismLevelsCreated).toBe(PARISH_ACADEMIC_SEED_LEVELS.length);

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

    const yearList = await academicYearService.listAcademicYearsByParish(parish!.id, {
      page: 1,
      limit: 5,
      sortBy: 'name',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
    });
    expect(yearList.items[0]?.status).toBe(AcademicYearStatus.Active);
    expect(yearList.items[0]?.startDate).toBe('2026-09-01');
    expect(yearList.items[0]?.endDate).toBe('2027-06-30');

    const levelList = await catechismLevelService.listCatechismLevelsByParish(parish!.id, {
      page: 1,
      limit: 10,
      sortBy: 'sortOrder',
      sort: 'ASC',
    });
    expect(levelList.total).toBe(PARISH_ACADEMIC_SEED_LEVELS.length);
  });

  it('remains idempotent on second run without duplicating demo records', async () => {
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE class_id IN (SELECT id FROM classes WHERE code IN ('demo-class-a', 'demo-class-b'))
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE class_id IN (SELECT id FROM classes WHERE code IN ('demo-class-a', 'demo-class-b'))
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
      DELETE FROM parishes
      WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
    `);

    const firstRun = await seedService.run();
    const secondRun = await seedService.run();

    expect(firstRun.parishCreated || firstRun.parishExisting).toBe(true);
    expect(secondRun.parishExisting).toBe(true);
    expect(secondRun.parishCreated).toBe(false);
    expect(secondRun.academicYearExisting).toBe(true);
    expect(secondRun.catechismLevelsExisting).toBe(PARISH_ACADEMIC_SEED_LEVELS.length);

    const parishCountRows: Array<{ count: number }> = await AppDataSource.query(`
      SELECT COUNT(*) AS count
      FROM parishes
      WHERE code = '${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}'
    `);
    expect(Number(parishCountRows[0]?.count ?? 0)).toBe(1);
  });

  it('rejects unsafe production seed environments', () => {
    expect(() => {
      assertSafeSeedEnvironment({
        NODE_ENV: 'production',
        DB_NAME: 'catechism_api_test',
      });
    }).toThrow(UnsafeSeedEnvironmentError);
  });
});
