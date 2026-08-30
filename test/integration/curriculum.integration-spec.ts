import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4, normalizeUuid } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { CurriculumModule } from '../../src/modules/curriculum/curriculum.module';
import { CurriculumStatus } from '../../src/modules/curriculum/enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../../src/modules/curriculum/enums/curriculum-version-status.enum';
import {
  CurriculumCodeAlreadyExistsError,
  CurriculumDraftAlreadyExistsError,
} from '../../src/modules/curriculum/errors/curriculum.errors';
import { TopicNotEmptyError } from '../../src/modules/curriculum/errors/topic.errors';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { TopicService } from '../../src/modules/curriculum/services/topic.service';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';

const TEST_CODE_PREFIX = 'cur003-int-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

describe('CurriculumService and TopicService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let catechismLevelService: CatechismLevelService;
  let curriculumService: CurriculumService;
  let topicService: TopicService;

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
        ParishModule,
        AcademicStructureModule,
        CurriculumModule,
      ],
    }).compile();

    parishService = moduleRef.get(ParishService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
    curriculumService = moduleRef.get(CurriculumService);
    topicService = moduleRef.get(TopicService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM lesson_contents
      WHERE lesson_id IN (
        SELECT l.id FROM lessons l
        INNER JOIN topics t ON t.id = l.topic_id
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM lessons
      WHERE topic_id IN (
        SELECT t.id FROM topics t
        INNER JOIN curriculum_versions cv ON cv.id = t.curriculum_version_id
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      DELETE FROM topics
      WHERE curriculum_version_id IN (
        SELECT cv.id FROM curriculum_versions cv
        INNER JOIN curriculums c ON c.id = cv.curriculum_id
        WHERE c.code LIKE '${TEST_CODE_PREFIX}%'
      )
    `);

    await AppDataSource.query(`
      UPDATE curriculums
      SET current_published_version_id = NULL
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM curriculum_versions
      WHERE curriculum_id IN (SELECT id FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

    await AppDataSource.query(`
      DELETE FROM curriculums WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM catechism_levels WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);

    await AppDataSource.query(`
      DELETE FROM users WHERE email LIKE '${TEST_CODE_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  async function insertUser(email: string): Promise<string> {
    const id = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO users (id, email, password_hash, status)
        VALUES (@0, @1, @2, @3)
      `,
      [id, email, DUMMY_PASSWORD_HASH, 'ACTIVE'],
    );

    return id;
  }

  async function insertLesson(
    curriculumVersionId: string,
    topicId: string,
    title: string,
    sortOrder: number,
  ): Promise<void> {
    const id = generateUuidV4();
    const canonicalLessonKey = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO lessons (
          id, curriculum_version_id, topic_id, canonical_lesson_key, title, sort_order, estimated_duration_minutes
        )
        VALUES (@0, @1, @2, @3, @4, @5, @6)
      `,
      [id, curriculumVersionId, topicId, canonicalLessonKey, title, sortOrder, 45],
    );
  }

  async function seedParishAndLevel(): Promise<{
    parishId: string;
    catechismLevelId: string;
    userId: string;
  }> {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Curriculum Integration Parish',
    });
    const catechismLevel = await catechismLevelService.createCatechismLevel(parish.id, {
      code: `${TEST_CODE_PREFIX}level`,
      name: 'Level One',
      sortOrder: 1,
    });
    const userId = await insertUser(`${TEST_CODE_PREFIX}user@example.com`);

    return {
      parishId: parish.id,
      catechismLevelId: catechismLevel.id,
      userId,
    };
  }

  it('creates curriculum with vi-VN sourceLocale', async () => {
    const { parishId, catechismLevelId } = await seedParishAndLevel();

    const snapshot = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-vi`,
      name: 'Giáo lý Khai Tâm',
      sourceLocale: 'vi-VN',
    });

    expect(snapshot.status).toBe(CurriculumStatus.Active);
    expect(snapshot.sourceLocale).toBe('vi-VN');
    expect(snapshot.name).toBe('Giáo lý Khai Tâm');
  });

  it('creates curriculum with fr-FR sourceLocale and Unicode name', async () => {
    const { parishId, catechismLevelId } = await seedParishAndLevel();

    const snapshot = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-fr`,
      name: 'Giáo lý Khai Tâm — École',
      sourceLocale: 'fr-FR',
    });

    expect(snapshot.sourceLocale).toBe('fr-FR');
    expect(snapshot.name).toBe('Giáo lý Khai Tâm — École');
  });

  it('maps duplicate curriculum codes within parish and level to CurriculumCodeAlreadyExistsError', async () => {
    const { parishId, catechismLevelId } = await seedParishAndLevel();
    const duplicateCode = `${TEST_CODE_PREFIX}dup-code`;

    await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: duplicateCode,
      name: 'First Curriculum',
      sourceLocale: 'vi-VN',
    });

    await expect(
      curriculumService.createCurriculum(parishId, {
        catechismLevelId,
        code: duplicateCode,
        name: 'Second Curriculum',
        sourceLocale: 'vi-VN',
      }),
    ).rejects.toBeInstanceOf(CurriculumCodeAlreadyExistsError);
  });

  it('creates a draft curriculum version', async () => {
    const { parishId, catechismLevelId, userId } = await seedParishAndLevel();
    const curriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-draft`,
      name: 'Draft Curriculum',
      sourceLocale: 'vi-VN',
    });

    const version = await curriculumService.createDraftVersion(curriculum.id, {
      label: 'Initial draft',
      createdByUserId: userId,
    });

    expect(version.status).toBe(CurriculumVersionStatus.Draft);
    expect(version.versionNumber).toBe(1);
    expect(version.label).toBe('Initial draft');
    expect(version.createdByUserId).toBe(userId);
  });

  it('enforces one DRAFT version per curriculum', async () => {
    const { parishId, catechismLevelId, userId } = await seedParishAndLevel();
    const curriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-one-draft`,
      name: 'One Draft Curriculum',
      sourceLocale: 'vi-VN',
    });

    await curriculumService.createDraftVersion(curriculum.id, {
      createdByUserId: userId,
    });

    await expect(
      curriculumService.createDraftVersion(curriculum.id, {
        createdByUserId: userId,
      }),
    ).rejects.toBeInstanceOf(CurriculumDraftAlreadyExistsError);
  });

  it('creates, reorders, and deletes topics in a draft version', async () => {
    const { parishId, catechismLevelId, userId } = await seedParishAndLevel();
    const curriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-topics`,
      name: 'Topic Curriculum',
      sourceLocale: 'vi-VN',
    });
    const version = await curriculumService.createDraftVersion(curriculum.id, {
      createdByUserId: userId,
    });

    const topicA = await topicService.createTopic(version.id, {
      title: 'Chủ đề A',
      sortOrder: 0,
    });
    const topicB = await topicService.createTopic(version.id, {
      title: 'Chủ đề B',
      sortOrder: 1,
    });

    expect(topicA.sortOrder).toBe(0);
    expect(topicB.sortOrder).toBe(1);

    const reordered = await topicService.reorderTopics(version.id, {
      topicIds: [topicB.id, topicA.id],
    });

    expect(reordered.map((topic) => topic.title)).toEqual(['Chủ đề B', 'Chủ đề A']);
    expect(reordered[0]?.sortOrder).toBe(0);
    expect(reordered[1]?.sortOrder).toBe(1);

    await topicService.deleteTopic(topicA.id);

    const remaining = await topicService.listTopicsByVersion(version.id);

    expect(remaining).toHaveLength(1);
    expect(normalizeUuid(remaining[0]?.id ?? '')).toBe(normalizeUuid(topicB.id));
    expect(remaining[0]?.sortOrder).toBe(0);
  });

  it('rejects deleting a topic that has lessons', async () => {
    const { parishId, catechismLevelId, userId } = await seedParishAndLevel();
    const curriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-lesson`,
      name: 'Lesson Curriculum',
      sourceLocale: 'vi-VN',
    });
    const version = await curriculumService.createDraftVersion(curriculum.id, {
      createdByUserId: userId,
    });
    const topic = await topicService.createTopic(version.id, {
      title: 'Chủ đề có bài học',
      sortOrder: 0,
    });

    await insertLesson(version.id, topic.id, 'Bài học 1', 0);

    await expect(topicService.deleteTopic(topic.id)).rejects.toBeInstanceOf(TopicNotEmptyError);
  });
});
