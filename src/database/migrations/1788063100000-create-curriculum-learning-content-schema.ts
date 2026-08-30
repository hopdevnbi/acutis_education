import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCurriculumLearningContentSchema1788063100000 implements MigrationInterface {
  name = 'CreateCurriculumLearningContentSchema1788063100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'curriculums',
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
            name: 'catechism_level_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: '512',
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
      'curriculums',
      new TableIndex({
        name: 'IX_curriculums_parish_id_catechism_level_id',
        columnNames: ['parish_id', 'catechism_level_id'],
      }),
    );

    await queryRunner.createIndex(
      'curriculums',
      new TableIndex({
        name: 'UQ_curriculums_parish_id_catechism_level_id_code',
        columnNames: ['parish_id', 'catechism_level_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'curriculums',
      new TableForeignKey({
        name: 'FK_curriculums_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'curriculums',
      new TableForeignKey({
        name: 'FK_curriculums_catechism_level_id_catechism_levels_id',
        columnNames: ['catechism_level_id'],
        referencedTableName: 'catechism_levels',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'curriculum_versions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'curriculum_id',
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
            name: 'label',
            type: 'nvarchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'published_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'published_by_user_id',
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
      'curriculum_versions',
      new TableIndex({
        name: 'IX_curriculum_versions_curriculum_id_status',
        columnNames: ['curriculum_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'curriculum_versions',
      new TableIndex({
        name: 'UQ_curriculum_versions_curriculum_id_version_number',
        columnNames: ['curriculum_id', 'version_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_versions',
      new TableForeignKey({
        name: 'FK_curriculum_versions_curriculum_id_curriculums_id',
        columnNames: ['curriculum_id'],
        referencedTableName: 'curriculums',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_versions',
      new TableForeignKey({
        name: 'FK_curriculum_versions_published_by_user_id_users_id',
        columnNames: ['published_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_versions',
      new TableForeignKey({
        name: 'FK_curriculum_versions_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_curriculum_versions_curriculum_id_draft]
      ON [curriculum_versions] ([curriculum_id])
      WHERE [status] = 'DRAFT'
    `);

    await queryRunner.query(`
      ALTER TABLE [curriculum_versions]
      ADD CONSTRAINT [CK_curriculum_versions_version_number_positive]
      CHECK ([version_number] > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [curriculum_versions]
      ADD CONSTRAINT [CK_curriculum_versions_published_at_status]
      CHECK (
        ([status] = 'DRAFT' AND [published_at] IS NULL)
        OR ([status] IN ('PUBLISHED', 'ARCHIVED') AND [published_at] IS NOT NULL)
      )
    `);

    await queryRunner.createForeignKey(
      'curriculums',
      new TableForeignKey({
        name: 'FK_curriculums_current_published_version_id_curriculum_versions_id',
        columnNames: ['current_published_version_id'],
        referencedTableName: 'curriculum_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'topics',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'curriculum_version_id',
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
            name: 'title',
            type: 'nvarchar',
            length: '256',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: '1024',
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
      'topics',
      new TableIndex({
        name: 'IX_topics_curriculum_version_id_sort_order',
        columnNames: ['curriculum_version_id', 'sort_order'],
      }),
    );

    await queryRunner.createForeignKey(
      'topics',
      new TableForeignKey({
        name: 'FK_topics_curriculum_version_id_curriculum_versions_id',
        columnNames: ['curriculum_version_id'],
        referencedTableName: 'curriculum_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_topics_curriculum_version_id_code]
      ON [topics] ([curriculum_version_id], [code])
      WHERE [code] IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [topics]
      ADD CONSTRAINT [CK_topics_sort_order_nonnegative]
      CHECK ([sort_order] >= 0)
    `);

    await queryRunner.createTable(
      new Table({
        name: 'lessons',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'curriculum_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'topic_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'canonical_lesson_key',
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
            name: 'title',
            type: 'nvarchar',
            length: '256',
            isNullable: false,
          },
          {
            name: 'summary',
            type: 'nvarchar',
            length: '1024',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'estimated_duration_minutes',
            type: 'int',
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
      'lessons',
      new TableIndex({
        name: 'IX_lessons_topic_id_sort_order',
        columnNames: ['topic_id', 'sort_order'],
      }),
    );

    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IX_lessons_curriculum_version_id',
        columnNames: ['curriculum_version_id'],
      }),
    );

    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IX_lessons_canonical_lesson_key',
        columnNames: ['canonical_lesson_key'],
      }),
    );

    await queryRunner.createForeignKey(
      'lessons',
      new TableForeignKey({
        name: 'FK_lessons_topic_id_topics_id',
        columnNames: ['topic_id'],
        referencedTableName: 'topics',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'lessons',
      new TableForeignKey({
        name: 'FK_lessons_curriculum_version_id_curriculum_versions_id',
        columnNames: ['curriculum_version_id'],
        referencedTableName: 'curriculum_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_lessons_topic_id_code]
      ON [lessons] ([topic_id], [code])
      WHERE [code] IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [lessons]
      ADD CONSTRAINT [CK_lessons_sort_order_nonnegative]
      CHECK ([sort_order] >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [lessons]
      ADD CONSTRAINT [CK_lessons_estimated_duration_minutes_range]
      CHECK (
        [estimated_duration_minutes] IS NULL
        OR ([estimated_duration_minutes] > 0 AND [estimated_duration_minutes] <= 1440)
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'lesson_contents',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'lesson_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'content_schema_version',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'content_json',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: false,
          },
          {
            name: 'content_hash',
            type: 'varchar',
            length: '64',
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
      'lesson_contents',
      new TableIndex({
        name: 'UQ_lesson_contents_lesson_id',
        columnNames: ['lesson_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'lesson_contents',
      new TableForeignKey({
        name: 'FK_lesson_contents_lesson_id_lessons_id',
        columnNames: ['lesson_id'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [lesson_contents]
      ADD CONSTRAINT [CK_lesson_contents_content_schema_version_positive]
      CHECK ([content_schema_version] > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [lesson_contents]
      ADD CONSTRAINT [CK_lesson_contents_content_json_is_json]
      CHECK (ISJSON([content_json]) = 1)
    `);

    await queryRunner.createTable(
      new Table({
        name: 'curriculum_assignments',
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
            name: 'academic_year_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'catechism_level_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'curriculum_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'assigned_by_user_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'assigned_at',
            type: 'datetime2',
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
      'curriculum_assignments',
      new TableIndex({
        name: 'UQ_curriculum_assignments_parish_year_level',
        columnNames: ['parish_id', 'academic_year_id', 'catechism_level_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_assignments',
      new TableForeignKey({
        name: 'FK_curriculum_assignments_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_assignments',
      new TableForeignKey({
        name: 'FK_curriculum_assignments_academic_year_id_academic_years_id',
        columnNames: ['academic_year_id'],
        referencedTableName: 'academic_years',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_assignments',
      new TableForeignKey({
        name: 'FK_curriculum_assignments_catechism_level_id_catechism_levels_id',
        columnNames: ['catechism_level_id'],
        referencedTableName: 'catechism_levels',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_assignments',
      new TableForeignKey({
        name: 'FK_curriculum_assignments_curriculum_version_id_curriculum_versions_id',
        columnNames: ['curriculum_version_id'],
        referencedTableName: 'curriculum_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'curriculum_assignments',
      new TableForeignKey({
        name: 'FK_curriculum_assignments_assigned_by_user_id_users_id',
        columnNames: ['assigned_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('curriculum_assignments', true);
    await queryRunner.dropTable('lesson_contents', true);
    await queryRunner.dropTable('lessons', true);
    await queryRunner.dropTable('topics', true);

    const curriculumsTable = await queryRunner.getTable('curriculums');
    const currentPublishedVersionForeignKey = curriculumsTable?.foreignKeys.find(
      (foreignKey) =>
        foreignKey.name === 'FK_curriculums_current_published_version_id_curriculum_versions_id',
    );

    if (currentPublishedVersionForeignKey) {
      await queryRunner.dropForeignKey('curriculums', currentPublishedVersionForeignKey);
    }

    await queryRunner.dropTable('curriculum_versions', true);
    await queryRunner.dropTable('curriculums', true);
  }
}
