import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { TranslationResourceEntity } from '../modules/localization/entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../modules/localization/entities/translation-revision.entity';

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
    .map((column) => column.propertyName);
}

describe('Localization foundation entities', () => {
  it('maps TranslationResourceEntity with scalar keys and no relations', () => {
    expect(resolveTableName(TranslationResourceEntity)).toBe('translation_resources');
    expect(resolveRelationCount(TranslationResourceEntity)).toBe(0);
    expect(resolveColumnNames(TranslationResourceEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'resourceType',
        'resourceId',
        'parishId',
        'sourceLocale',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps TranslationRevisionEntity with scalar keys and no relations', () => {
    expect(resolveTableName(TranslationRevisionEntity)).toBe('translation_revisions');
    expect(resolveRelationCount(TranslationRevisionEntity)).toBe(0);
    expect(resolveColumnNames(TranslationRevisionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'translationResourceId',
        'targetLocale',
        'revisionNumber',
        'sourceContentHash',
        'sourceVersionKey',
        'status',
        'payloadJson',
        'providerId',
        'providerModel',
        'glossaryVersionId',
        'createdByUserId',
        'approvedByUserId',
        'createdAt',
        'approvedAt',
      ]),
    );
  });
});
