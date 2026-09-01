import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { LessonProgressEntity } from '../modules/learning-progress/entities/lesson-progress.entity';

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

describe('Learning progress foundation entities', () => {
  it('maps LessonProgressEntity with scalar foreign keys and no relations', () => {
    expect(resolveTableName(LessonProgressEntity)).toBe('lesson_progress');
    expect(resolveRelationCount(LessonProgressEntity)).toBe(0);

    expect(resolveColumnNames(LessonProgressEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'enrollmentId',
        'curriculumId',
        'canonicalLessonKey',
        'assignedCurriculumVersionId',
        'status',
        'startedAt',
        'startedByUserId',
        'completedAt',
        'completedByUserId',
        'createdAt',
        'updatedAt',
      ]),
    );
  });
});
