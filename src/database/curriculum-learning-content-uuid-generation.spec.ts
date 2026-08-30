import { isUuidV4 } from '../database/uuid-v4.util';
import { CurriculumAssignmentEntity } from '../modules/curriculum/entities/curriculum-assignment.entity';
import { CurriculumVersionEntity } from '../modules/curriculum/entities/curriculum-version.entity';
import { CurriculumEntity } from '../modules/curriculum/entities/curriculum.entity';
import { LessonEntity } from '../modules/curriculum/entities/lesson.entity';
import { TopicEntity } from '../modules/curriculum/entities/topic.entity';
import { CurriculumStatus } from '../modules/curriculum/enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../modules/curriculum/enums/curriculum-version-status.enum';
import { LessonContentEntity } from '../modules/learning-content/entities/lesson-content.entity';

describe('Curriculum learning content entity UUID generation', () => {
  it.each([
    ['CurriculumEntity', () => new CurriculumEntity()],
    ['CurriculumVersionEntity', () => new CurriculumVersionEntity()],
    ['TopicEntity', () => new TopicEntity()],
    ['LessonEntity', () => new LessonEntity()],
    ['CurriculumAssignmentEntity', () => new CurriculumAssignmentEntity()],
    ['LessonContentEntity', () => new LessonContentEntity()],
  ])('assigns RFC UUID v4 ids to new %s instances', (_label, createEntity) => {
    const firstEntity = createEntity() as { id: string };
    const secondEntity = createEntity() as { id: string };

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('does not regenerate id when CurriculumEntity is constructed with explicit values', () => {
    const explicitId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const curriculum = new CurriculumEntity();
    curriculum.id = explicitId;
    curriculum.parishId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    curriculum.catechismLevelId = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    curriculum.code = 'khai-tam';
    curriculum.name = 'Khai Tam';
    curriculum.status = CurriculumStatus.Active;
    curriculum.sourceLocale = 'vi-VN';
    curriculum.currentPublishedVersionId = null;
    curriculum.description = null;

    expect(curriculum.id).toBe(explicitId);
  });

  it('assigns canonicalLessonKey as UUID v4 and preserves explicit values', () => {
    const lesson = new LessonEntity();
    expect(isUuidV4(lesson.canonicalLessonKey)).toBe(true);

    const explicitKey = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    const clonedLesson = new LessonEntity();
    clonedLesson.canonicalLessonKey = explicitKey;

    expect(clonedLesson.canonicalLessonKey).toBe(explicitKey);
  });

  it('allows scalar foreign key assignment without relations on CurriculumVersionEntity', () => {
    const version = new CurriculumVersionEntity();
    version.curriculumId = 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    version.versionNumber = 1;
    version.status = CurriculumVersionStatus.Draft;
    version.label = 'Initial draft';
    version.publishedAt = null;
    version.publishedByUserId = null;
    version.createdByUserId = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';

    expect(version.status).toBe(CurriculumVersionStatus.Draft);
    expect(version.publishedAt).toBeNull();
  });

  it('allows LessonContentEntity scalar lessonId and nullable contentHash', () => {
    const content = new LessonContentEntity();
    content.lessonId = 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
    content.contentSchemaVersion = 1;
    content.contentJson = '{"schemaVersion":1,"blocks":[]}';
    content.contentHash = null;

    expect(content.contentHash).toBeNull();
    expect(content.contentSchemaVersion).toBe(1);
  });
});
