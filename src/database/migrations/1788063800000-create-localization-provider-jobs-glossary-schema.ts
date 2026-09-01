import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateLocalizationProviderJobsGlossarySchema1788063800000 implements MigrationInterface {
  name = 'CreateLocalizationProviderJobsGlossarySchema1788063800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'translation_jobs',
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
            name: 'attempt_count',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'max_attempts',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'requested_by_user_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'provider_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'last_error_code',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'last_error_message',
            type: 'nvarchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'next_attempt_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'locked_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'datetime2',
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'translation_jobs',
      new TableIndex({
        name: 'IX_translation_jobs_status_next_attempt_at_created_at',
        columnNames: ['status', 'next_attempt_at', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'translation_jobs',
      new TableIndex({
        name: 'IX_translation_jobs_resource_target_locale_source_hash',
        columnNames: ['translation_resource_id', 'target_locale', 'source_content_hash'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_translation_jobs_active_semantic_key]
      ON [translation_jobs] ([translation_resource_id], [target_locale], [source_content_hash], [provider_id])
      WHERE [status] IN ('QUEUED', 'PROCESSING')
    `);

    await queryRunner.query(`
      ALTER TABLE [translation_jobs]
      ADD CONSTRAINT [CK_translation_jobs_status]
      CHECK ([status] IN ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD'))
    `);

    await queryRunner.query(`
      ALTER TABLE [translation_jobs]
      ADD CONSTRAINT [CK_translation_jobs_source_content_hash_format]
      CHECK (
        LEN([source_content_hash]) = 64
        AND [source_content_hash] NOT LIKE '%[^0-9a-f]%'
      )
    `);

    await queryRunner.createForeignKey(
      'translation_jobs',
      new TableForeignKey({
        name: 'FK_translation_jobs_translation_resource_id_translation_resources_id',
        columnNames: ['translation_resource_id'],
        referencedTableName: 'translation_resources',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'translation_jobs',
      new TableForeignKey({
        name: 'FK_translation_jobs_requested_by_user_id_users_id',
        columnNames: ['requested_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'catholic_glossary_versions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'source_locale',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'target_locale',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'version_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'provider_glossary_id',
            type: 'varchar',
            length: '256',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'published_by_user_id',
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
            name: 'published_at',
            type: 'datetime2',
            isNullable: true,
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
      'catholic_glossary_versions',
      new TableIndex({
        name: 'UQ_catholic_glossary_versions_locales_version_number',
        columnNames: ['source_locale', 'target_locale', 'version_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'catholic_glossary_versions',
      new TableIndex({
        name: 'IX_catholic_glossary_versions_locales_status',
        columnNames: ['source_locale', 'target_locale', 'status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [catholic_glossary_versions]
      ADD CONSTRAINT [CK_catholic_glossary_versions_status]
      CHECK ([status] IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
    `);

    await queryRunner.createForeignKey(
      'catholic_glossary_versions',
      new TableForeignKey({
        name: 'FK_catholic_glossary_versions_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'catholic_glossary_versions',
      new TableForeignKey({
        name: 'FK_catholic_glossary_versions_published_by_user_id_users_id',
        columnNames: ['published_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'catholic_glossary_terms',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'glossary_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'source_term',
            type: 'nvarchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'target_term',
            type: 'nvarchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'nvarchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'case_sensitive',
            type: 'bit',
            default: 0,
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
      'catholic_glossary_terms',
      new TableIndex({
        name: 'UQ_catholic_glossary_terms_version_id_source_term',
        columnNames: ['glossary_version_id', 'source_term'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'catholic_glossary_terms',
      new TableIndex({
        name: 'IX_catholic_glossary_terms_glossary_version_id',
        columnNames: ['glossary_version_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'catholic_glossary_terms',
      new TableForeignKey({
        name: 'FK_catholic_glossary_terms_glossary_version_id_catholic_glossary_versions_id',
        columnNames: ['glossary_version_id'],
        referencedTableName: 'catholic_glossary_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'translation_revisions',
      new TableForeignKey({
        name: 'FK_translation_revisions_glossary_version_id_catholic_glossary_versions_id',
        columnNames: ['glossary_version_id'],
        referencedTableName: 'catholic_glossary_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'translation_revisions',
      'FK_translation_revisions_glossary_version_id_catholic_glossary_versions_id',
    );
    await queryRunner.dropTable('catholic_glossary_terms', true);
    await queryRunner.dropTable('catholic_glossary_versions', true);
    await queryRunner.dropTable('translation_jobs', true);
  }
}
