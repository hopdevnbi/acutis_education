import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateMediaAssetsSchema1788063200000 implements MigrationInterface {
  name = 'CreateMediaAssetsSchema1788063200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'media_assets',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'storage_provider',
            type: 'varchar',
            length: '16',
            isNullable: false,
          },
          {
            name: 'storage_key',
            type: 'nvarchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'original_file_name',
            type: 'nvarchar',
            length: '260',
            isNullable: false,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '127',
            isNullable: false,
          },
          {
            name: 'media_category',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'size_bytes',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'checksum_sha256',
            type: 'char',
            length: '64',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'visibility',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'created_by_user_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'datetime2',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'media_assets',
      new TableIndex({
        name: 'UQ_media_assets_storage_provider_storage_key',
        columnNames: ['storage_provider', 'storage_key'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'media_assets',
      new TableIndex({
        name: 'IX_media_assets_status_created_at',
        columnNames: ['status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'media_assets',
      new TableIndex({
        name: 'IX_media_assets_created_by_user_id',
        columnNames: ['created_by_user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'media_assets',
      new TableForeignKey({
        name: 'FK_media_assets_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [media_assets]
      ADD CONSTRAINT [CK_media_assets_size_bytes_positive]
      CHECK ([size_bytes] > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [media_assets]
      ADD CONSTRAINT [CK_media_assets_checksum_sha256_format]
      CHECK (
        LEN([checksum_sha256]) = 64
        AND [checksum_sha256] = LOWER([checksum_sha256])
        AND [checksum_sha256] NOT LIKE '%[^0123456789abcdef]%'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [media_assets]
      ADD CONSTRAINT [CK_media_assets_storage_provider_allowed]
      CHECK ([storage_provider] IN ('local', 's3'))
    `);

    await queryRunner.query(`
      ALTER TABLE [media_assets]
      ADD CONSTRAINT [CK_media_assets_media_category_allowed]
      CHECK ([media_category] IN ('IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO'))
    `);

    await queryRunner.query(`
      ALTER TABLE [media_assets]
      ADD CONSTRAINT [CK_media_assets_status_allowed]
      CHECK ([status] IN ('PENDING', 'READY', 'FAILED', 'DELETED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [media_assets]
      ADD CONSTRAINT [CK_media_assets_visibility_allowed]
      CHECK ([visibility] IN ('PRIVATE', 'AUTHENTICATED', 'PUBLIC'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [media_assets] DROP CONSTRAINT [CK_media_assets_visibility_allowed]
    `);
    await queryRunner.query(`
      ALTER TABLE [media_assets] DROP CONSTRAINT [CK_media_assets_status_allowed]
    `);
    await queryRunner.query(`
      ALTER TABLE [media_assets] DROP CONSTRAINT [CK_media_assets_media_category_allowed]
    `);
    await queryRunner.query(`
      ALTER TABLE [media_assets] DROP CONSTRAINT [CK_media_assets_storage_provider_allowed]
    `);
    await queryRunner.query(`
      ALTER TABLE [media_assets] DROP CONSTRAINT [CK_media_assets_checksum_sha256_format]
    `);
    await queryRunner.query(`
      ALTER TABLE [media_assets] DROP CONSTRAINT [CK_media_assets_size_bytes_positive]
    `);

    await queryRunner.dropTable('media_assets', true);
  }
}
