import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePracticeSchema1788063400000 implements MigrationInterface {
  name = 'CreatePracticeSchema1788063400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'practice_sessions',
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
            name: 'session_type',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'source_session_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'locale',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'curriculum_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'canonical_lesson_key',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'requested_question_count',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'max_attempts_per_question',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'randomize_questions',
            type: 'bit',
            isNullable: false,
          },
          {
            name: 'randomize_options',
            type: 'bit',
            isNullable: false,
          },
          {
            name: 'client_request_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'completed_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'abandoned_at',
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
      'practice_sessions',
      new TableIndex({
        name: 'IX_practice_sessions_enrollment_id_status',
        columnNames: ['enrollment_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'practice_sessions',
      new TableIndex({
        name: 'IX_practice_sessions_enrollment_id_created_at',
        columnNames: ['enrollment_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'practice_sessions',
      new TableIndex({
        name: 'IX_practice_sessions_source_session_id',
        columnNames: ['source_session_id'],
      }),
    );

    await queryRunner.createIndex(
      'practice_sessions',
      new TableIndex({
        name: 'IX_practice_sessions_curriculum_id_canonical_lesson_key',
        columnNames: ['curriculum_id', 'canonical_lesson_key'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_practice_sessions_enrollment_id_client_request_id]
      ON [practice_sessions] ([enrollment_id], [client_request_id])
      WHERE [client_request_id] IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_sessions]
      ADD CONSTRAINT [CK_practice_sessions_session_type]
      CHECK ([session_type] IN ('STANDARD', 'REVIEW_WRONG'))
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_sessions]
      ADD CONSTRAINT [CK_practice_sessions_status]
      CHECK ([status] IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_sessions]
      ADD CONSTRAINT [CK_practice_sessions_session_type_source]
      CHECK (
        ([session_type] = 'STANDARD' AND [source_session_id] IS NULL)
        OR
        ([session_type] = 'REVIEW_WRONG' AND [source_session_id] IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_sessions]
      ADD CONSTRAINT [CK_practice_sessions_status_timestamps]
      CHECK (
        ([status] = 'IN_PROGRESS' AND [completed_at] IS NULL AND [abandoned_at] IS NULL)
        OR
        ([status] = 'COMPLETED' AND [completed_at] IS NOT NULL AND [abandoned_at] IS NULL)
        OR
        ([status] = 'ABANDONED' AND [abandoned_at] IS NOT NULL AND [completed_at] IS NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_sessions]
      ADD CONSTRAINT [CK_practice_sessions_source_not_self]
      CHECK ([source_session_id] IS NULL OR [source_session_id] <> [id])
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_sessions]
      ADD CONSTRAINT [CK_practice_sessions_requested_question_count]
      CHECK ([requested_question_count] >= 1 AND [requested_question_count] <= 50)
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_sessions]
      ADD CONSTRAINT [CK_practice_sessions_max_attempts_per_question]
      CHECK ([max_attempts_per_question] >= 1 AND [max_attempts_per_question] <= 10)
    `);

    await queryRunner.createForeignKey(
      'practice_sessions',
      new TableForeignKey({
        name: 'FK_practice_sessions_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'practice_sessions',
      new TableForeignKey({
        name: 'FK_practice_sessions_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'practice_sessions',
      new TableForeignKey({
        name: 'FK_practice_sessions_source_session_id_practice_sessions_id',
        columnNames: ['source_session_id'],
        referencedTableName: 'practice_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'practice_session_questions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'practice_session_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'question_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'position',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'delivered_option_order_json',
            type: 'nvarchar',
            length: 'MAX',
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
      'practice_session_questions',
      new TableIndex({
        name: 'IX_practice_session_questions_practice_session_id',
        columnNames: ['practice_session_id'],
      }),
    );

    await queryRunner.createIndex(
      'practice_session_questions',
      new TableIndex({
        name: 'UQ_practice_session_questions_practice_session_id_position',
        columnNames: ['practice_session_id', 'position'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'practice_session_questions',
      new TableIndex({
        name: 'UQ_practice_session_questions_practice_session_id_question_version_id',
        columnNames: ['practice_session_id', 'question_version_id'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [practice_session_questions]
      ADD CONSTRAINT [CK_practice_session_questions_position]
      CHECK ([position] >= 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_session_questions]
      ADD CONSTRAINT [CK_practice_session_questions_delivered_option_order_json]
      CHECK (
        [delivered_option_order_json] IS NULL
        OR ISJSON([delivered_option_order_json]) = 1
      )
    `);

    await queryRunner.createForeignKey(
      'practice_session_questions',
      new TableForeignKey({
        name: 'FK_practice_session_questions_practice_session_id_practice_sessions_id',
        columnNames: ['practice_session_id'],
        referencedTableName: 'practice_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'practice_answer_attempts',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'practice_session_question_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'attempt_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'client_answer_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'selected_option_ids_json',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: false,
          },
          {
            name: 'is_correct',
            type: 'bit',
            isNullable: false,
          },
          {
            name: 'score',
            type: 'tinyint',
            isNullable: false,
          },
          {
            name: 'submitted_by_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'submitted_at',
            type: 'datetime2',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'practice_answer_attempts',
      new TableIndex({
        name: 'IX_practice_answer_attempts_practice_session_question_id',
        columnNames: ['practice_session_question_id'],
      }),
    );

    await queryRunner.createIndex(
      'practice_answer_attempts',
      new TableIndex({
        name: 'UQ_practice_answer_attempts_practice_session_question_id_client_answer_id',
        columnNames: ['practice_session_question_id', 'client_answer_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'practice_answer_attempts',
      new TableIndex({
        name: 'UQ_practice_answer_attempts_practice_session_question_id_attempt_number',
        columnNames: ['practice_session_question_id', 'attempt_number'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [practice_answer_attempts]
      ADD CONSTRAINT [CK_practice_answer_attempts_attempt_number]
      CHECK ([attempt_number] >= 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_answer_attempts]
      ADD CONSTRAINT [CK_practice_answer_attempts_score]
      CHECK ([score] IN (0, 1))
    `);

    await queryRunner.query(`
      ALTER TABLE [practice_answer_attempts]
      ADD CONSTRAINT [CK_practice_answer_attempts_selected_option_ids_json]
      CHECK (ISJSON([selected_option_ids_json]) = 1)
    `);

    await queryRunner.createForeignKey(
      'practice_answer_attempts',
      new TableForeignKey({
        name: 'FK_practice_answer_attempts_practice_session_question_id_practice_session_questions_id',
        columnNames: ['practice_session_question_id'],
        referencedTableName: 'practice_session_questions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'practice_answer_attempts',
      new TableForeignKey({
        name: 'FK_practice_answer_attempts_submitted_by_user_id_users_id',
        columnNames: ['submitted_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('practice_answer_attempts', true, true, true);
    await queryRunner.dropTable('practice_session_questions', true, true, true);
    await queryRunner.dropTable('practice_sessions', true, true, true);
  }
}
