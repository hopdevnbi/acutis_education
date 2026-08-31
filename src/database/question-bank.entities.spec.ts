import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { QuestionCorrectOptionEntity } from '../modules/question-bank/entities/question-correct-option.entity';
import { QuestionCurriculumLinkEntity } from '../modules/question-bank/entities/question-curriculum-link.entity';
import { QuestionOptionEntity } from '../modules/question-bank/entities/question-option.entity';
import { QuestionTagLinkEntity } from '../modules/question-bank/entities/question-tag-link.entity';
import { QuestionTagEntity } from '../modules/question-bank/entities/question-tag.entity';
import { QuestionVersionEntity } from '../modules/question-bank/entities/question-version.entity';
import { QuestionEntity } from '../modules/question-bank/entities/question.entity';

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

describe('Question bank foundation entities', () => {
  it('maps QuestionEntity with parish scope and sourceLocale', () => {
    expect(resolveTableName(QuestionEntity)).toBe('questions');
    expect(resolveRelationCount(QuestionEntity)).toBe(0);

    expect(resolveColumnNames(QuestionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'code',
        'status',
        'sourceLocale',
        'currentPublishedVersionId',
        'createdByUserId',
        'createdAt',
        'updatedAt',
      ]),
    );

    const sourceLocaleColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === QuestionEntity && column.propertyName === 'sourceLocale',
    );

    expect(sourceLocaleColumn?.options.type).toBe('varchar');
    expect(sourceLocaleColumn?.options.length).toBe(32);
    expect(sourceLocaleColumn?.options.nullable).not.toBe(true);
  });

  it('maps QuestionVersionEntity with media JSON and sourceContentHash fields', () => {
    expect(resolveTableName(QuestionVersionEntity)).toBe('question_versions');
    expect(resolveRelationCount(QuestionVersionEntity)).toBe(0);

    expect(resolveColumnNames(QuestionVersionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'questionId',
        'versionNumber',
        'status',
        'questionType',
        'prompt',
        'instruction',
        'explanation',
        'promptMediaJson',
        'explanationMediaJson',
        'answerDefinitionJson',
        'difficulty',
        'sourceContentHash',
        'createdByUserId',
        'publishedByUserId',
        'publishedAt',
        'createdAt',
        'updatedAt',
      ]),
    );

    const sourceContentHashColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === QuestionVersionEntity && column.propertyName === 'sourceContentHash',
    );

    expect(sourceContentHashColumn?.options.type).toBe('varchar');
    expect(sourceContentHashColumn?.options.length).toBe(64);
    expect(sourceContentHashColumn?.options.nullable).toBe(true);
  });

  it('maps QuestionOptionEntity with text/media representation fields and no media FK relation', () => {
    expect(resolveTableName(QuestionOptionEntity)).toBe('question_options');
    expect(resolveRelationCount(QuestionOptionEntity)).toBe(0);

    expect(resolveColumnNames(QuestionOptionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'questionVersionId',
        'code',
        'text',
        'mediaAssetId',
        'sortOrder',
        'createdAt',
        'updatedAt',
      ]),
    );

    const textColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === QuestionOptionEntity && column.propertyName === 'text',
    );

    expect(textColumn?.options.type).toBe('nvarchar');
    expect(textColumn?.options.nullable).toBe(true);
  });

  it('maps QuestionCorrectOptionEntity with composite primary key', () => {
    expect(resolveTableName(QuestionCorrectOptionEntity)).toBe('question_correct_options');
    expect(resolveRelationCount(QuestionCorrectOptionEntity)).toBe(0);

    expect(resolveColumnNames(QuestionCorrectOptionEntity)).toEqual(
      expect.arrayContaining(['questionVersionId', 'optionId']),
    );
  });

  it('maps QuestionTagEntity with Unicode name', () => {
    expect(resolveTableName(QuestionTagEntity)).toBe('question_tags');
    expect(resolveRelationCount(QuestionTagEntity)).toBe(0);

    const nameColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === QuestionTagEntity && column.propertyName === 'name',
    );

    expect(nameColumn?.options.type).toBe('nvarchar');
    expect(nameColumn?.options.length).toBe(128);
  });

  it('maps QuestionTagLinkEntity and QuestionCurriculumLinkEntity without ORM relations', () => {
    expect(resolveTableName(QuestionTagLinkEntity)).toBe('question_tag_links');
    expect(resolveRelationCount(QuestionTagLinkEntity)).toBe(0);

    expect(resolveTableName(QuestionCurriculumLinkEntity)).toBe('question_curriculum_links');
    expect(resolveRelationCount(QuestionCurriculumLinkEntity)).toBe(0);

    expect(resolveColumnNames(QuestionCurriculumLinkEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'questionId',
        'parishId',
        'curriculumId',
        'canonicalLessonKey',
        'authoringCurriculumVersionId',
        'createdAt',
      ]),
    );
  });

  it('uses application-assigned primary keys instead of generated columns', () => {
    const entityTargets = [
      QuestionEntity,
      QuestionVersionEntity,
      QuestionOptionEntity,
      QuestionTagEntity,
      QuestionCurriculumLinkEntity,
    ];

    const generatedColumnCount = getMetadataArgsStorage().generations.filter((generation) =>
      entityTargets.includes(generation.target as typeof QuestionEntity),
    ).length;

    expect(generatedColumnCount).toBe(0);
  });

  it('provides multilingual-ready source fields without translation tables', () => {
    expect(resolveColumnNames(QuestionEntity)).toContain('sourceLocale');
    expect(resolveColumnNames(QuestionVersionEntity)).toContain('sourceContentHash');

    const translationTableNames = getMetadataArgsStorage()
      .tables.map((table) => table.name)
      .filter((name): name is string => typeof name === 'string' && name.includes('translation'));

    expect(translationTableNames).toEqual([]);
  });
});
