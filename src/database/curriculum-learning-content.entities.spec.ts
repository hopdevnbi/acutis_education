import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { CurriculumAssignmentEntity } from '../modules/curriculum/entities/curriculum-assignment.entity';
import { CurriculumVersionEntity } from '../modules/curriculum/entities/curriculum-version.entity';
import { CurriculumEntity } from '../modules/curriculum/entities/curriculum.entity';
import { LessonEntity } from '../modules/curriculum/entities/lesson.entity';
import { TopicEntity } from '../modules/curriculum/entities/topic.entity';
import { LessonContentEntity } from '../modules/learning-content/entities/lesson-content.entity';

function resolveTableName(entityTarget: EntityTarget<object>): string | undefined {
  const tableMetadata = getMetadataArgsStorage().tables.find(
    (table) => table.target === entityTarget,
  );

  return tableMetadata?.name;
}

function resolveRelationCount(entityTarget: EntityTarget<object>): number {
  return getMetadataArgsStorage().relations.filter((relation) => relation.target === entityTarget)
    .length;
}

function resolveColumnNames(entityTarget: EntityTarget<object>): string[] {
  return getMetadataArgsStorage()
    .columns.filter((column) => column.target === entityTarget)
    .map((column) => column.options.name ?? column.propertyName);
}

describe('Curriculum learning content entities', () => {
  it('maps CurriculumEntity with sourceLocale and scalar scope IDs', () => {
    expect(resolveTableName(CurriculumEntity)).toBe('curriculums');
    expect(resolveRelationCount(CurriculumEntity)).toBe(0);

    expect(resolveColumnNames(CurriculumEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'catechismLevelId',
        'code',
        'name',
        'description',
        'status',
        'sourceLocale',
        'currentPublishedVersionId',
        'createdAt',
        'updatedAt',
      ]),
    );

    const sourceLocaleColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === CurriculumEntity && column.propertyName === 'sourceLocale',
    );

    expect(sourceLocaleColumn?.options.type).toBe('varchar');
    expect(sourceLocaleColumn?.options.length).toBe(32);
    expect(sourceLocaleColumn?.options.nullable).not.toBe(true);
  });

  it('maps CurriculumVersionEntity with scalar author user IDs', () => {
    expect(resolveTableName(CurriculumVersionEntity)).toBe('curriculum_versions');
    expect(resolveRelationCount(CurriculumVersionEntity)).toBe(0);

    expect(resolveColumnNames(CurriculumVersionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'curriculumId',
        'versionNumber',
        'status',
        'label',
        'publishedAt',
        'publishedByUserId',
        'createdByUserId',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps TopicEntity with scalar curriculumVersionId', () => {
    expect(resolveTableName(TopicEntity)).toBe('topics');
    expect(resolveRelationCount(TopicEntity)).toBe(0);

    expect(resolveColumnNames(TopicEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'curriculumVersionId',
        'code',
        'title',
        'description',
        'sortOrder',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps LessonEntity with canonicalLessonKey and scalar IDs', () => {
    expect(resolveTableName(LessonEntity)).toBe('lessons');
    expect(resolveRelationCount(LessonEntity)).toBe(0);

    expect(resolveColumnNames(LessonEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'curriculumVersionId',
        'topicId',
        'canonicalLessonKey',
        'code',
        'title',
        'summary',
        'sortOrder',
        'estimatedDurationMinutes',
        'createdAt',
        'updatedAt',
      ]),
    );

    const canonicalLessonKeyColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === LessonEntity && column.propertyName === 'canonicalLessonKey',
    );

    expect(canonicalLessonKeyColumn?.options.type).toBe('uniqueidentifier');
  });

  it('maps LessonContentEntity with contentHash and JSON payload column', () => {
    expect(resolveTableName(LessonContentEntity)).toBe('lesson_contents');
    expect(resolveRelationCount(LessonContentEntity)).toBe(0);

    expect(resolveColumnNames(LessonContentEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'lessonId',
        'contentSchemaVersion',
        'contentJson',
        'contentHash',
        'createdAt',
        'updatedAt',
      ]),
    );

    const contentHashColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === LessonContentEntity && column.propertyName === 'contentHash',
    );

    expect(contentHashColumn?.options.type).toBe('varchar');
    expect(contentHashColumn?.options.length).toBe(64);
    expect(contentHashColumn?.options.nullable).toBe(true);
  });

  it('maps CurriculumAssignmentEntity with delivery triple keys', () => {
    expect(resolveTableName(CurriculumAssignmentEntity)).toBe('curriculum_assignments');
    expect(resolveRelationCount(CurriculumAssignmentEntity)).toBe(0);

    expect(resolveColumnNames(CurriculumAssignmentEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'academicYearId',
        'catechismLevelId',
        'curriculumVersionId',
        'assignedByUserId',
        'assignedAt',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('uses application-assigned primary keys instead of generated columns', () => {
    const entityTargets = [
      CurriculumEntity,
      CurriculumVersionEntity,
      TopicEntity,
      LessonEntity,
      CurriculumAssignmentEntity,
      LessonContentEntity,
    ];

    const generatedColumnCount = getMetadataArgsStorage().generations.filter((generation) =>
      entityTargets.includes(generation.target as typeof CurriculumEntity),
    ).length;

    expect(generatedColumnCount).toBe(0);
  });

  it('provides multilingual-ready source fields without translation tables', () => {
    expect(resolveColumnNames(CurriculumEntity)).toContain('sourceLocale');
    expect(resolveColumnNames(LessonContentEntity)).toContain('contentHash');

    const translationTableNames = getMetadataArgsStorage()
      .tables.map((table) => table.name)
      .filter((name): name is string => typeof name === 'string' && name.includes('translation'));

    expect(translationTableNames).toEqual([]);
  });
});
