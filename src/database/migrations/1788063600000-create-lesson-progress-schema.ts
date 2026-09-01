import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateLessonProgressSchema1788063600000 implements MigrationInterface {
  name = 'CreateLessonProgressSchema1788063600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'lesson_progress',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'enrollment_id',
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
            isNullable: false,
          },
          {
            name: 'assigned_curriculum_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'started_by_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'completed_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'completed_by_user_id',
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
      'lesson_progress',
      new TableIndex({
        name: 'IX_lesson_progress_enrollment_id_status',
        columnNames: ['enrollment_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IX_lesson_progress_enrollment_id_curriculum_id',
        columnNames: ['enrollment_id', 'curriculum_id'],
      }),
    );

    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IX_lesson_progress_enrollment_id_updated_at',
        columnNames: ['enrollment_id', 'updated_at'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_lesson_progress_enrollment_id_curriculum_id_canonical_lesson_key]
      ON [lesson_progress] ([enrollment_id], [curriculum_id], [canonical_lesson_key])
    `);

    await queryRunner.query(`
      ALTER TABLE [lesson_progress]
      ADD CONSTRAINT [CK_lesson_progress_status]
      CHECK ([status] IN ('IN_PROGRESS', 'COMPLETED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [lesson_progress]
      ADD CONSTRAINT [CK_lesson_progress_status_timestamps]
      CHECK (
        ([status] = 'IN_PROGRESS' AND [completed_at] IS NULL AND [completed_by_user_id] IS NULL)
        OR
        ([status] = 'COMPLETED' AND [completed_at] IS NOT NULL AND [completed_by_user_id] IS NOT NULL)
      )
    `);

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        name: 'FK_lesson_progress_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        name: 'FK_lesson_progress_started_by_user_id_users_id',
        columnNames: ['started_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        name: 'FK_lesson_progress_completed_by_user_id_users_id',
        columnNames: ['completed_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lesson_progress', true);
  }
}
