import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateLocalizationFoundationSchema1788063700000 implements MigrationInterface {
  name = 'CreateLocalizationFoundationSchema1788063700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [users]
      ADD [preferred_locale] varchar(32) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [parishes]
      ADD [default_locale] varchar(32) NULL
    `);

    await queryRunner.createTable(
      new Table({
        name: 'translation_resources',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'resource_type',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'resource_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'parish_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'source_locale',
            type: 'varchar',
            length: '32',
            isNullable: false,
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'translation_resources',
      new TableIndex({
        name: 'UQ_translation_resources_resource_type_resource_id',
        columnNames: ['resource_type', 'resource_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'translation_resources',
      new TableIndex({
        name: 'IX_translation_resources_parish_id',
        columnNames: ['parish_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [translation_resources]
      ADD CONSTRAINT [CK_translation_resources_resource_type]
      CHECK ([resource_type] IN (
        'CURRICULUM_METADATA',
        'CURRICULUM_VERSION',
        'CURRICULUM_TOPIC',
        'CURRICULUM_LESSON',
        'LEARNING_CONTENT_DOCUMENT',
        'QUESTION_BANK_VERSION'
      ))
    `);

    await queryRunner.createTable(
      new Table({
        name: 'translation_revisions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'translation_resource_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'target_locale',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'revision_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'source_content_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'source_version_key',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'payload_json',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: false,
          },
          {
            name: 'provider_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'provider_model',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'glossary_version_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'approved_by_user_id',
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
            name: 'approved_at',
            type: 'datetime2',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'translation_revisions',
      new TableIndex({
        name: 'UQ_translation_revisions_resource_id_target_locale_revision_number',
        columnNames: ['translation_resource_id', 'target_locale', 'revision_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'translation_revisions',
      new TableIndex({
        name: 'IX_translation_revisions_resource_id_target_locale_status',
        columnNames: ['translation_resource_id', 'target_locale', 'status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [translation_revisions]
      ADD CONSTRAINT [CK_translation_revisions_status]
      CHECK ([status] IN (
        'QUEUED',
        'TRANSLATING',
        'MACHINE_TRANSLATED',
        'REVIEWED',
        'APPROVED',
        'FAILED'
      ))
    `);

    await queryRunner.query(`
      ALTER TABLE [translation_revisions]
      ADD CONSTRAINT [CK_translation_revisions_source_content_hash_format]
      CHECK (
        LEN([source_content_hash]) = 64
        AND [source_content_hash] NOT LIKE '%[^0-9a-f]%'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [translation_revisions]
      ADD CONSTRAINT [CK_translation_revisions_payload_json]
      CHECK (ISJSON([payload_json]) = 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [translation_revisions]
      ADD CONSTRAINT [CK_translation_revisions_approved_metadata]
      CHECK (
        ([status] <> 'APPROVED')
        OR
        ([approved_by_user_id] IS NOT NULL AND [approved_at] IS NOT NULL)
      )
    `);

    await queryRunner.createForeignKey(
      'translation_revisions',
      new TableForeignKey({
        name: 'FK_translation_revisions_translation_resource_id_translation_resources_id',
        columnNames: ['translation_resource_id'],
        referencedTableName: 'translation_resources',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'translation_revisions',
      new TableForeignKey({
        name: 'FK_translation_revisions_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'translation_revisions',
      new TableForeignKey({
        name: 'FK_translation_revisions_approved_by_user_id_users_id',
        columnNames: ['approved_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('translation_revisions', true);
    await queryRunner.dropTable('translation_resources', true);
    await queryRunner.query(`
      ALTER TABLE [parishes]
      DROP COLUMN [default_locale]
    `);
    await queryRunner.query(`
      ALTER TABLE [users]
      DROP COLUMN [preferred_locale]
    `);
  }
}
