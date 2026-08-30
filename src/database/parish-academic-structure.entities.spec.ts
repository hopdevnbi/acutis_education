import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { AcademicYearEntity } from '../modules/academic-structure/entities/academic-year.entity';
import { CatechismLevelEntity } from '../modules/academic-structure/entities/catechism-level.entity';
import { ParishEntity } from '../modules/parish/entities/parish.entity';

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

describe('Parish academic structure entities', () => {
  it('maps ParishEntity to parishes with expected columns', () => {
    expect(resolveTableName(ParishEntity)).toBe('parishes');

    expect(resolveColumnNames(ParishEntity)).toEqual(
      expect.arrayContaining(['id', 'code', 'name', 'status', 'createdAt', 'updatedAt']),
    );
  });

  it('maps AcademicYearEntity to academic_years with scalar parishId and DATE fields', () => {
    expect(resolveTableName(AcademicYearEntity)).toBe('academic_years');
    expect(resolveRelationCount(AcademicYearEntity)).toBe(0);

    const columnNames = resolveColumnNames(AcademicYearEntity);
    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'name',
        'startDate',
        'endDate',
        'status',
        'createdAt',
        'updatedAt',
      ]),
    );

    const startDateColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === AcademicYearEntity && column.propertyName === 'startDate',
    );
    const endDateColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === AcademicYearEntity && column.propertyName === 'endDate',
    );

    expect(startDateColumn?.options.type).toBe('date');
    expect(endDateColumn?.options.type).toBe('date');
  });

  it('maps CatechismLevelEntity to catechism_levels with scalar parishId and sortOrder', () => {
    expect(resolveTableName(CatechismLevelEntity)).toBe('catechism_levels');
    expect(resolveRelationCount(CatechismLevelEntity)).toBe(0);

    const columnNames = resolveColumnNames(CatechismLevelEntity);
    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'code',
        'name',
        'sortOrder',
        'status',
        'createdAt',
        'updatedAt',
      ]),
    );

    const sortOrderColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === CatechismLevelEntity && column.propertyName === 'sortOrder',
    );

    expect(sortOrderColumn?.options.type).toBe('int');
  });

  it('uses application-assigned primary keys instead of generated columns', () => {
    const generatedColumnCount = getMetadataArgsStorage().generations.filter((generation) =>
      [ParishEntity, AcademicYearEntity, CatechismLevelEntity].includes(
        generation.target as typeof ParishEntity,
      ),
    ).length;

    expect(generatedColumnCount).toBe(0);
  });
});
