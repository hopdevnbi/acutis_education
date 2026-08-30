import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { MediaAssetEntity } from '../modules/media/entities/media-asset.entity';

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

describe('Media foundation entities', () => {
  it('maps MediaAssetEntity without TypeORM relations', () => {
    expect(resolveTableName(MediaAssetEntity)).toBe('media_assets');
    expect(resolveRelationCount(MediaAssetEntity)).toBe(0);

    expect(resolveColumnNames(MediaAssetEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'storageProvider',
        'storageKey',
        'originalFileName',
        'mimeType',
        'mediaCategory',
        'sizeBytes',
        'checksumSha256',
        'status',
        'visibility',
        'createdByUserId',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ]),
    );
  });

  it('stores media asset primary keys without database-generated defaults', () => {
    const idColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === MediaAssetEntity && column.propertyName === 'id',
    );

    expect(idColumn?.options.type).toBe('uniqueidentifier');
    expect(idColumn?.options.generated).toBeUndefined();
    expect(idColumn?.options.default).toBeUndefined();
  });

  it('persists sizeBytes as bigint mapped to string in TypeScript', () => {
    const sizeBytesColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === MediaAssetEntity && column.propertyName === 'sizeBytes',
    );

    expect(sizeBytesColumn?.options.type).toBe('bigint');
  });
});
