import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateQuestionBankSchema1788063300000 implements MigrationInterface {
  name = 'CreateQuestionBankSchema1788063300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'questions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'parish_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'source_locale',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'current_published_version_id',
            type: 'uniqueidentifier',
            isNullable: true,
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'questions',
      new TableIndex({
        name: 'IX_questions_parish_id_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_questions_parish_id_code]
      ON [questions] ([parish_id], [code])
      WHERE [code] IS NOT NULL
    `);

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        name: 'FK_questions_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        name: 'FK_questions_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'question_versions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'question_id',
            type: 'uniqueidentifier',
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
            name: 'question_type',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'prompt',
            type: 'nvarchar',
            length: '2000',
            isNullable: false,
          },
          {
            name: 'instruction',
            type: 'nvarchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'explanation',
            type: 'nvarchar',
            length: '2000',
            isNullable: true,
          },
          {
            name: 'prompt_media_json',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'explanation_media_json',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'answer_definition_json',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'difficulty',
            type: 'varchar',
            length: '16',
            isNullable: true,
          },
          {
            name: 'source_content_hash',
            type: 'varchar',
            length: '64',
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
            name: 'published_at',
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
      'question_versions',
      new TableIndex({
        name: 'IX_question_versions_question_id_status',
        columnNames: ['question_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'question_versions',
      new TableIndex({
        name: 'IX_question_versions_question_type',
        columnNames: ['question_type'],
      }),
    );

    await queryRunner.createIndex(
      'question_versions',
      new TableIndex({
        name: 'IX_question_versions_difficulty',
        columnNames: ['difficulty'],
      }),
    );

    await queryRunner.createIndex(
      'question_versions',
      new TableIndex({
        name: 'UQ_question_versions_question_id_version_number',
        columnNames: ['question_id', 'version_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'question_versions',
      new TableForeignKey({
        name: 'FK_question_versions_question_id_questions_id',
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'question_versions',
      new TableForeignKey({
        name: 'FK_question_versions_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'question_versions',
      new TableForeignKey({
        name: 'FK_question_versions_published_by_user_id_users_id',
        columnNames: ['published_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_question_versions_question_id_draft]
      ON [question_versions] ([question_id])
      WHERE [status] = 'DRAFT'
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_version_number_positive]
      CHECK ([version_number] > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_status_allowed]
      CHECK ([status] IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_question_type_allowed]
      CHECK ([question_type] IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'))
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_difficulty_allowed]
      CHECK ([difficulty] IS NULL OR [difficulty] IN ('EASY', 'MEDIUM', 'HARD'))
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_source_content_hash_format]
      CHECK (
        [source_content_hash] IS NULL
        OR (
          LEN([source_content_hash]) = 64
          AND [source_content_hash] NOT LIKE '%[^0-9a-f]%'
        )
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_published_at_status]
      CHECK (
        ([status] = 'DRAFT' AND [published_at] IS NULL)
        OR ([status] IN ('PUBLISHED', 'ARCHIVED') AND [published_at] IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_prompt_media_json_isjson]
      CHECK ([prompt_media_json] IS NULL OR ISJSON([prompt_media_json]) = 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_explanation_media_json_isjson]
      CHECK ([explanation_media_json] IS NULL OR ISJSON([explanation_media_json]) = 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [question_versions]
      ADD CONSTRAINT [CK_question_versions_answer_definition_json_isjson]
      CHECK ([answer_definition_json] IS NULL OR ISJSON([answer_definition_json]) = 1)
    `);

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        name: 'FK_questions_current_published_version_id_question_versions_id',
        columnNames: ['current_published_version_id'],
        referencedTableName: 'question_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'question_options',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'question_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'text',
            type: 'nvarchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'media_asset_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'int',
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
      'question_options',
      new TableIndex({
        name: 'IX_question_options_question_version_id',
        columnNames: ['question_version_id'],
      }),
    );

    await queryRunner.createIndex(
      'question_options',
      new TableIndex({
        name: 'UQ_question_options_question_version_id_sort_order',
        columnNames: ['question_version_id', 'sort_order'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'question_options',
      new TableIndex({
        name: 'UQ_question_options_question_version_id_id',
        columnNames: ['question_version_id', 'id'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_question_options_question_version_id_code]
      ON [question_options] ([question_version_id], [code])
      WHERE [code] IS NOT NULL
    `);

    await queryRunner.createForeignKey(
      'question_options',
      new TableForeignKey({
        name: 'FK_question_options_question_version_id_question_versions_id',
        columnNames: ['question_version_id'],
        referencedTableName: 'question_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [question_options]
      ADD CONSTRAINT [CK_question_options_sort_order_nonnegative]
      CHECK ([sort_order] >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [question_options]
      ADD CONSTRAINT [CK_question_options_representation_required]
      CHECK ([text] IS NOT NULL OR [media_asset_id] IS NOT NULL)
    `);

    await queryRunner.createTable(
      new Table({
        name: 'question_correct_options',
        columns: [
          {
            name: 'question_version_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'option_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'question_correct_options',
      new TableIndex({
        name: 'IX_question_correct_options_question_version_id',
        columnNames: ['question_version_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'question_correct_options',
      new TableForeignKey({
        name: 'FK_question_correct_options_question_version_id_question_versions_id',
        columnNames: ['question_version_id'],
        referencedTableName: 'question_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'question_correct_options',
      new TableForeignKey({
        name: 'FK_question_correct_options_option_version_question_options',
        columnNames: ['question_version_id', 'option_id'],
        referencedTableName: 'question_options',
        referencedColumnNames: ['question_version_id', 'id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'question_tags',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'parish_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'status',
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
      'question_tags',
      new TableIndex({
        name: 'IX_question_tags_parish_id_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'question_tags',
      new TableIndex({
        name: 'UQ_question_tags_parish_id_code',
        columnNames: ['parish_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'question_tags',
      new TableForeignKey({
        name: 'FK_question_tags_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'question_tag_links',
        columns: [
          {
            name: 'question_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'tag_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'question_tag_links',
      new TableIndex({
        name: 'IX_question_tag_links_tag_id',
        columnNames: ['tag_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'question_tag_links',
      new TableForeignKey({
        name: 'FK_question_tag_links_question_id_questions_id',
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'question_tag_links',
      new TableForeignKey({
        name: 'FK_question_tag_links_tag_id_question_tags_id',
        columnNames: ['tag_id'],
        referencedTableName: 'question_tags',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'question_curriculum_links',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'question_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'parish_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'curriculum_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'canonical_lesson_key',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'authoring_curriculum_version_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'question_curriculum_links',
      new TableIndex({
        name: 'IX_question_curriculum_links_question_id',
        columnNames: ['question_id'],
      }),
    );

    await queryRunner.createIndex(
      'question_curriculum_links',
      new TableIndex({
        name: 'IX_question_curriculum_links_curriculum_id',
        columnNames: ['curriculum_id'],
      }),
    );

    await queryRunner.createIndex(
      'question_curriculum_links',
      new TableIndex({
        name: 'IX_question_curriculum_links_canonical_lesson_key',
        columnNames: ['canonical_lesson_key'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_question_curriculum_links_question_curriculum_no_lesson]
      ON [question_curriculum_links] ([question_id], [curriculum_id])
      WHERE [canonical_lesson_key] IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_question_curriculum_links_question_curriculum_lesson]
      ON [question_curriculum_links] ([question_id], [curriculum_id], [canonical_lesson_key])
      WHERE [canonical_lesson_key] IS NOT NULL
    `);

    await queryRunner.createForeignKey(
      'question_curriculum_links',
      new TableForeignKey({
        name: 'FK_question_curriculum_links_question_id_questions_id',
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'question_curriculum_links',
      new TableForeignKey({
        name: 'FK_question_curriculum_links_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'question_curriculum_links',
      new TableForeignKey({
        name: 'FK_question_curriculum_links_curriculum_id_curriculums_id',
        columnNames: ['curriculum_id'],
        referencedTableName: 'curriculums',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'question_curriculum_links',
      new TableForeignKey({
        name: 'FK_question_curriculum_links_authoring_version_id_curriculum_versions_id',
        columnNames: ['authoring_curriculum_version_id'],
        referencedTableName: 'curriculum_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('question_curriculum_links', true);
    await queryRunner.dropTable('question_tag_links', true);
    await queryRunner.dropTable('question_tags', true);
    await queryRunner.dropTable('question_correct_options', true);
    await queryRunner.dropTable('question_options', true);

    await queryRunner.dropForeignKey(
      'questions',
      'FK_questions_current_published_version_id_question_versions_id',
    );

    await queryRunner.dropTable('question_versions', true);
    await queryRunner.dropTable('questions', true);
  }
}
