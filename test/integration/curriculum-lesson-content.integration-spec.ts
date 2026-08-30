import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4, normalizeUuid } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AcademicStructureModule } from '../../src/modules/academic-structure/academic-structure.module';
import { AcademicYearService } from '../../src/modules/academic-structure/services/academic-year.service';
import { CatechismLevelService } from '../../src/modules/academic-structure/services/catechism-level.service';
import { CurriculumOrchestrationModule } from '../../src/modules/curriculum-orchestration/curriculum-orchestration.module';
import { CurriculumVersionOrchestrationService } from '../../src/modules/curriculum-orchestration/services/curriculum-version-orchestration.service';
import { CurriculumModule } from '../../src/modules/curriculum/curriculum.module';
import { LessonEntity } from '../../src/modules/curriculum/entities/lesson.entity';
import { CurriculumVersionStatus } from '../../src/modules/curriculum/enums/curriculum-version-status.enum';
import {
  CurriculumPublishValidationError,
  CurriculumVersionNotDraftError,
} from '../../src/modules/curriculum/errors/curriculum.errors';
import { CurriculumService } from '../../src/modules/curriculum/services/curriculum.service';
import { LessonService } from '../../src/modules/curriculum/services/lesson.service';
import { TopicService } from '../../src/modules/curriculum/services/topic.service';
import {
  CONTENT_DOCUMENT_SCHEMA_VERSION,
  type ContentDocumentV1,
} from '../../src/modules/learning-content/interfaces/learning-content.interface';
import { LearningContentModule } from '../../src/modules/learning-content/learning-content.module';
import { LearningContentService } from '../../src/modules/learning-content/services/learning-content.service';
import { computeContentHash } from '../../src/modules/learning-content/utils/content-hash.util';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';

const TEST_CODE_PREFIX = 'cur004-int-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';

const sampleDocument: ContentDocumentV1 = {
  schemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
  blocks: [
    { type: 'heading', level: 1, text: 'Giáo lý Khai Tâm' },
    { type: 'paragraph', text: 'Nội dung bài học mẫu.' },
  ],
};

describe('Curriculum lesson and content integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;
  let catechismLevelService: CatechismLevelService;
  let academicYearService: AcademicYearService;
  let curriculumService: CurriculumService;
  let topicService: TopicService;
  let lessonService: LessonService;
  let learningContentService: LearningContentService;
  let curriculumVersionOrchestrationService: CurriculumVersionOrchestrationService;

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
        LearningContentModule,
        CurriculumOrchestrationModule,
      ],
    }).compile();

    parishService = moduleRef.get(ParishService);
    catechismLevelService = moduleRef.get(CatechismLevelService);
    academicYearService = moduleRef.get(AcademicYearService);
    curriculumService = moduleRef.get(CurriculumService);
    topicService = moduleRef.get(TopicService);
    lessonService = moduleRef.get(LessonService);
    learningContentService = moduleRef.get(LearningContentService);
    curriculumVersionOrchestrationService = moduleRef.get(CurriculumVersionOrchestrationService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM curriculum_assignments
      WHERE parish_id IN (SELECT id FROM parishes WHERE code LIKE '${TEST_CODE_PREFIX}%')
    `);

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
      DELETE FROM academic_years WHERE name LIKE '${TEST_CODE_PREFIX}%'
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

  async function seedParishLevelAndUser(): Promise<{
    parishId: string;
    catechismLevelId: string;
    userId: string;
  }> {
    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Curriculum Lesson Content Parish',
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

  async function seedDraftCurriculumWithTopic(): Promise<{
    versionId: string;
    topicId: string;
    userId: string;
  }> {
    const { parishId, catechismLevelId, userId } = await seedParishLevelAndUser();
    const curriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-${generateUuidV4().slice(0, 8)}`,
      name: 'Lesson Content Curriculum',
      sourceLocale: 'vi-VN',
    });
    const version = await curriculumService.createDraftVersion(curriculum.id, {
      createdByUserId: userId,
    });
    const topic = await topicService.createTopic(version.id, {
      title: 'Chủ đề A',
      sortOrder: 0,
    });

    return { versionId: version.id, topicId: topic.id, userId };
  }

  it('creates, updates, reorders, and deletes lessons via LessonService', async () => {
    const { topicId } = await seedDraftCurriculumWithTopic();

    const lessonA = await lessonService.createLesson(topicId, {
      title: 'Bài học A',
      sortOrder: 0,
      estimatedDurationMinutes: 45,
    });
    const lessonB = await lessonService.createLesson(topicId, {
      title: 'Bài học B',
      sortOrder: 1,
      estimatedDurationMinutes: 30,
    });

    expect(lessonA.canonicalLessonKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const updated = await lessonService.updateLesson(lessonA.id, {
      title: 'Bài học A — cập nhật',
    });

    expect(updated.title).toBe('Bài học A — cập nhật');

    const reordered = await lessonService.reorderLessons(topicId, {
      lessonIds: [lessonB.id, lessonA.id],
    });

    expect(reordered.map((lesson) => lesson.title)).toEqual(['Bài học B', 'Bài học A — cập nhật']);

    await lessonService.deleteLessonStructure(lessonA.id);

    const remaining = await lessonService.listLessonsByTopic(topicId);

    expect(remaining).toHaveLength(1);
    expect(normalizeUuid(remaining[0]?.id ?? '')).toBe(normalizeUuid(lessonB.id));
    expect(remaining[0]?.sortOrder).toBe(0);
  });

  it('upserts lesson content and computes a stable content hash', async () => {
    const { topicId } = await seedDraftCurriculumWithTopic();
    const lesson = await lessonService.createLesson(topicId, {
      title: 'Bài có nội dung',
      sortOrder: 0,
    });

    const created = await learningContentService.upsertLessonContent(lesson.id, {
      document: sampleDocument,
    });

    expect(created.contentHash).toBe(computeContentHash(sampleDocument));

    const updatedDocument: ContentDocumentV1 = {
      schemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
      blocks: [
        { type: 'heading', level: 1, text: 'Giáo lý Khai Tâm' },
        { type: 'paragraph', text: 'Nội dung đã cập nhật.' },
      ],
    };

    const updated = await learningContentService.upsertLessonContent(lesson.id, {
      document: updatedDocument,
    });

    expect(updated.contentHash).toBe(computeContentHash(updatedDocument));
    expect(updated.contentHash).not.toBe(created.contentHash);

    const fetched = await learningContentService.getLessonContent(lesson.id);

    expect(fetched.contentHash).toBe(updated.contentHash);
    expect(fetched.document.blocks[1]?.type).toBe('paragraph');
  });

  it('rejects publish when version has no topics or missing lesson content', async () => {
    const { parishId, catechismLevelId, userId } = await seedParishLevelAndUser();

    const emptyCurriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-pub-empty`,
      name: 'Publish Empty Curriculum',
      sourceLocale: 'vi-VN',
    });
    const emptyVersion = await curriculumService.createDraftVersion(emptyCurriculum.id, {
      createdByUserId: userId,
    });

    try {
      await curriculumVersionOrchestrationService.publishVersion(emptyVersion.id, userId);
      throw new Error('Expected publish to fail for empty version');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CurriculumPublishValidationError);
      const publishError = error as CurriculumPublishValidationError;
      expect(publishError.issues.some((issue) => issue.code === 'NO_TOPICS')).toBe(true);
    }

    const noLessonsCurriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-pub-nolsn`,
      name: 'Publish No Lessons Curriculum',
      sourceLocale: 'vi-VN',
    });
    const noLessonsVersion = await curriculumService.createDraftVersion(noLessonsCurriculum.id, {
      createdByUserId: userId,
    });
    const emptyTopic = await topicService.createTopic(noLessonsVersion.id, {
      title: 'Chủ đề trống',
      sortOrder: 0,
    });

    try {
      await curriculumVersionOrchestrationService.publishVersion(noLessonsVersion.id, userId);
      throw new Error('Expected publish to fail for topic without lessons');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CurriculumPublishValidationError);
      const publishError = error as CurriculumPublishValidationError;
      const topicIssue = publishError.issues.find(
        (issue) => issue.code === 'TOPIC_WITHOUT_LESSONS',
      );

      expect(topicIssue).toBeDefined();
      expect(normalizeUuid(topicIssue?.resourceId ?? '')).toBe(normalizeUuid(emptyTopic.id));
    }

    const missingContentCurriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-pub-nocnt`,
      name: 'Publish Missing Content Curriculum',
      sourceLocale: 'vi-VN',
    });
    const missingContentVersion = await curriculumService.createDraftVersion(
      missingContentCurriculum.id,
      { createdByUserId: userId },
    );
    const topic = await topicService.createTopic(missingContentVersion.id, {
      title: 'Chủ đề thiếu nội dung',
      sortOrder: 0,
    });
    const lesson = await lessonService.createLesson(topic.id, {
      title: 'Bài thiếu nội dung',
      sortOrder: 0,
    });

    try {
      await curriculumVersionOrchestrationService.publishVersion(missingContentVersion.id, userId);
      throw new Error('Expected publish to fail for missing content');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CurriculumPublishValidationError);
      const publishError = error as CurriculumPublishValidationError;
      const contentIssue = publishError.issues.find((issue) => issue.code === 'CONTENT_MISSING');

      expect(contentIssue).toBeDefined();
      expect(normalizeUuid(contentIssue?.resourceId ?? '')).toBe(normalizeUuid(lesson.id));
    }
  });

  it('publishes a valid version and blocks topic mutation after publish', async () => {
    const { topicId, userId } = await seedDraftCurriculumWithTopic();
    const lesson = await lessonService.createLesson(topicId, {
      title: 'Bài đủ nội dung',
      sortOrder: 0,
    });

    await learningContentService.upsertLessonContent(lesson.id, { document: sampleDocument });

    const context = await lessonService.getLessonCurriculumContext(lesson.id);
    const published = await curriculumVersionOrchestrationService.publishVersion(
      context.curriculumVersionId,
      userId,
    );

    expect(published.status).toBe(CurriculumVersionStatus.Published);

    await expect(
      topicService.updateTopic(topicId, { title: 'Chủ đề sau publish' }),
    ).rejects.toBeInstanceOf(CurriculumVersionNotDraftError);
  });

  it('clones a published version preserving canonicalLessonKey and copying content', async () => {
    const { parishId, catechismLevelId, userId } = await seedParishLevelAndUser();
    const curriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-clone`,
      name: 'Clone Curriculum',
      sourceLocale: 'vi-VN',
    });
    const draftVersion = await curriculumService.createDraftVersion(curriculum.id, {
      createdByUserId: userId,
    });
    const topic = await topicService.createTopic(draftVersion.id, {
      title: 'Chủ đề gốc',
      sortOrder: 0,
    });
    const sourceLesson = await lessonService.createLesson(topic.id, {
      title: 'Bài gốc',
      sortOrder: 0,
    });
    const sourceCanonicalKey = sourceLesson.canonicalLessonKey;

    await learningContentService.upsertLessonContent(sourceLesson.id, { document: sampleDocument });

    const published = await curriculumVersionOrchestrationService.publishVersion(
      draftVersion.id,
      userId,
    );

    expect(published.status).toBe(CurriculumVersionStatus.Published);

    const clonedDraft = await curriculumVersionOrchestrationService.cloneVersionToDraft(
      published.id,
      userId,
    );

    expect(clonedDraft.status).toBe(CurriculumVersionStatus.Draft);

    const clonedTree = await curriculumService.getVersionTree(clonedDraft.id);

    expect(clonedTree.topics).toHaveLength(1);
    expect(clonedTree.topics[0]?.lessons).toHaveLength(1);
    expect(normalizeUuid(clonedTree.topics[0]?.lessons[0]?.canonicalLessonKey ?? '')).toBe(
      normalizeUuid(sourceCanonicalKey),
    );
    expect(normalizeUuid(clonedTree.topics[0]?.lessons[0]?.id ?? '')).not.toBe(
      normalizeUuid(sourceLesson.id),
    );

    const clonedLessonId = clonedTree.topics[0]?.lessons[0]?.id ?? '';
    const clonedContent = await learningContentService.getLessonContent(clonedLessonId);

    expect(clonedContent.contentHash).toBe(computeContentHash(sampleDocument));
  });

  it('upserts curriculum assignment for a published version', async () => {
    const { parishId, catechismLevelId, userId } = await seedParishLevelAndUser();
    const academicYear = await academicYearService.createAcademicYear(parishId, {
      name: `${TEST_CODE_PREFIX}year-assign`,
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });
    const curriculum = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: `${TEST_CODE_PREFIX}cur-assign`,
      name: 'Assignment Curriculum',
      sourceLocale: 'vi-VN',
    });
    const draftVersion = await curriculumService.createDraftVersion(curriculum.id, {
      createdByUserId: userId,
    });
    const topic = await topicService.createTopic(draftVersion.id, {
      title: 'Chủ đề assign',
      sortOrder: 0,
    });
    const lesson = await lessonService.createLesson(topic.id, {
      title: 'Bài assign',
      sortOrder: 0,
    });

    await learningContentService.upsertLessonContent(lesson.id, { document: sampleDocument });

    const published = await curriculumVersionOrchestrationService.publishVersion(
      draftVersion.id,
      userId,
    );

    const assignment = await curriculumService.upsertCurriculumAssignment(
      parishId,
      academicYear.id,
      catechismLevelId,
      {
        curriculumVersionId: published.id,
        assignedByUserId: userId,
      },
    );

    expect(normalizeUuid(assignment.curriculumVersionId)).toBe(normalizeUuid(published.id));

    const fetched = await curriculumService.getCurriculumAssignment(
      parishId,
      academicYear.id,
      catechismLevelId,
    );

    expect(normalizeUuid(fetched.curriculumVersionId)).toBe(normalizeUuid(published.id));
  });

  it('loads version tree with a single lessons query (no N+1)', async () => {
    const { versionId, topicId } = await seedDraftCurriculumWithTopic();
    const topicB = await topicService.createTopic(versionId, {
      title: 'Chủ đề B',
      sortOrder: 1,
    });

    await lessonService.createLesson(topicId, { title: 'Bài A1', sortOrder: 0 });
    await lessonService.createLesson(topicId, { title: 'Bài A2', sortOrder: 1 });
    await lessonService.createLesson(topicB.id, { title: 'Bài B1', sortOrder: 0 });

    const lessonRepository = moduleRef.get<Repository<LessonEntity>>(
      getRepositoryToken(LessonEntity),
    );
    const findSpy = jest.spyOn(lessonRepository, 'find');

    const tree = await curriculumService.getVersionTree(versionId);

    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(tree.topics).toHaveLength(2);
    expect(tree.topics[0]?.lessons).toHaveLength(2);
    expect(tree.topics[1]?.lessons).toHaveLength(1);

    findSpy.mockRestore();
  });
});
