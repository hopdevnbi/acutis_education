import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { CatholicGlossaryTermEntity } from '../modules/localization/entities/catholic-glossary-term.entity';
import { CatholicGlossaryVersionEntity } from '../modules/localization/entities/catholic-glossary-version.entity';
import { TranslationJobEntity } from '../modules/localization/entities/translation-job.entity';
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

describe('Localization provider/jobs/glossary entities', () => {
  it('maps TranslationJobEntity without relations', () => {
    expect(resolveTableName(TranslationJobEntity)).toBe('translation_jobs');
    expect(resolveRelationCount(TranslationJobEntity)).toBe(0);
  });

  it('maps Catholic glossary entities without relations', () => {
    expect(resolveTableName(CatholicGlossaryVersionEntity)).toBe('catholic_glossary_versions');
    expect(resolveTableName(CatholicGlossaryTermEntity)).toBe('catholic_glossary_terms');
    expect(resolveRelationCount(CatholicGlossaryVersionEntity)).toBe(0);
    expect(resolveRelationCount(CatholicGlossaryTermEntity)).toBe(0);
  });

  it('keeps exactly five localization-owned tables represented in entity metadata', () => {
    const tableNames = [
      TranslationResourceEntity,
      TranslationRevisionEntity,
      TranslationJobEntity,
      CatholicGlossaryVersionEntity,
      CatholicGlossaryTermEntity,
    ].map((entity) => resolveTableName(entity));

    expect(new Set(tableNames).size).toBe(5);
  });
});
