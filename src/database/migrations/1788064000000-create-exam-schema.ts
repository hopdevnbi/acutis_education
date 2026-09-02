import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateExamSchema1788064000000 implements MigrationInterface {
  name = 'CreateExamSchema1788064000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'exams',
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
            length: '32',
            isNullable: false,
          },
          {
            name: 'status',
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
      'exams',
      new TableIndex({
        name: 'IX_exams_parish_id_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'exams',
      new TableIndex({
        name: 'UQ_exams_parish_id_code',
        columnNames: ['parish_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [exams]
      ADD CONSTRAINT [CK_exams_status]
      CHECK ([status] IN ('ACTIVE', 'INACTIVE'))
    `);

    await queryRunner.createForeignKey(
      'exams',
      new TableForeignKey({
        name: 'FK_exams_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_versions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'exam_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'version_number',
            type: 'int',
            isNullable: false,
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
            length: '512',
            isNullable: true,
          },
          {
            name: 'instructions',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'source_locale',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'duration_minutes',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'max_attempts',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'passing_score_percent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'shuffle_questions',
            type: 'bit',
            isNullable: false,
          },
          {
            name: 'shuffle_options',
            type: 'bit',
            isNullable: false,
          },
          {
            name: 'review_policy_json',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
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
      'exam_versions',
      new TableIndex({
        name: 'IX_exam_versions_exam_id_status',
        columnNames: ['exam_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'exam_versions',
      new TableIndex({
        name: 'UQ_exam_versions_exam_id_version_number',
        columnNames: ['exam_id', 'version_number'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_exam_versions_exam_id_published]
      ON [exam_versions] ([exam_id])
      WHERE [status] = 'PUBLISHED'
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_versions]
      ADD CONSTRAINT [CK_exam_versions_status]
      CHECK ([status] IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_versions]
      ADD CONSTRAINT [CK_exam_versions_version_number]
      CHECK ([version_number] >= 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_versions]
      ADD CONSTRAINT [CK_exam_versions_duration_minutes]
      CHECK ([duration_minutes] >= 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_versions]
      ADD CONSTRAINT [CK_exam_versions_max_attempts]
      CHECK ([max_attempts] >= 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_versions]
      ADD CONSTRAINT [CK_exam_versions_passing_score_percent]
      CHECK (
        [passing_score_percent] IS NULL
        OR ([passing_score_percent] >= 0 AND [passing_score_percent] <= 100)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_versions]
      ADD CONSTRAINT [CK_exam_versions_review_policy_json]
      CHECK (ISJSON([review_policy_json]) = 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_versions]
      ADD CONSTRAINT [CK_exam_versions_published_metadata]
      CHECK (
        ([status] = 'DRAFT' AND [published_at] IS NULL AND [published_by_user_id] IS NULL)
        OR
        (
          [status] IN ('PUBLISHED', 'ARCHIVED')
          AND [published_at] IS NOT NULL
          AND [published_by_user_id] IS NOT NULL
        )
      )
    `);

    await queryRunner.createForeignKey(
      'exam_versions',
      new TableForeignKey({
        name: 'FK_exam_versions_exam_id_exams_id',
        columnNames: ['exam_id'],
        referencedTableName: 'exams',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_versions',
      new TableForeignKey({
        name: 'FK_exam_versions_published_by_user_id_users_id',
        columnNames: ['published_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'exams',
      new TableForeignKey({
        name: 'FK_exams_current_published_version_id_exam_versions_id',
        columnNames: ['current_published_version_id'],
        referencedTableName: 'exam_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_version_questions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'exam_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'question_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'question_version_id',
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'exam_version_questions',
      new TableIndex({
        name: 'IX_exam_version_questions_exam_version_id',
        columnNames: ['exam_version_id'],
      }),
    );

    await queryRunner.createIndex(
      'exam_version_questions',
      new TableIndex({
        name: 'UQ_exam_version_questions_exam_version_id_sort_order',
        columnNames: ['exam_version_id', 'sort_order'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'exam_version_questions',
      new TableIndex({
        name: 'UQ_exam_version_questions_exam_version_id_question_id',
        columnNames: ['exam_version_id', 'question_id'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [exam_version_questions]
      ADD CONSTRAINT [CK_exam_version_questions_sort_order]
      CHECK ([sort_order] >= 1)
    `);

    await queryRunner.createForeignKey(
      'exam_version_questions',
      new TableForeignKey({
        name: 'FK_exam_version_questions_exam_version_id_exam_versions_id',
        columnNames: ['exam_version_id'],
        referencedTableName: 'exam_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_assignments',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'exam_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'class_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'opens_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'closes_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'created_by_user_id',
            type: 'uniqueidentifier',
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
      'exam_assignments',
      new TableIndex({
        name: 'IX_exam_assignments_class_id_status',
        columnNames: ['class_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'exam_assignments',
      new TableIndex({
        name: 'IX_exam_assignments_exam_version_id',
        columnNames: ['exam_version_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [exam_assignments]
      ADD CONSTRAINT [CK_exam_assignments_status]
      CHECK ([status] IN ('SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_assignments]
      ADD CONSTRAINT [CK_exam_assignments_window]
      CHECK ([closes_at] > [opens_at])
    `);

    await queryRunner.createForeignKey(
      'exam_assignments',
      new TableForeignKey({
        name: 'FK_exam_assignments_exam_version_id_exam_versions_id',
        columnNames: ['exam_version_id'],
        referencedTableName: 'exam_versions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_assignments',
      new TableForeignKey({
        name: 'FK_exam_assignments_class_id_classes_id',
        columnNames: ['class_id'],
        referencedTableName: 'classes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_assignments',
      new TableForeignKey({
        name: 'FK_exam_assignments_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_attempts',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'exam_assignment_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'enrollment_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'attempt_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'started_by_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'client_request_id',
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
            name: 'auto_submit_reason',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'exam_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'exam_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'student_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'class_id',
            type: 'uniqueidentifier',
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
            name: 'exam_title_delivered',
            type: 'nvarchar',
            length: '256',
            isNullable: false,
          },
          {
            name: 'instructions_delivered',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'exam_translation_revision_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'delivered_locale',
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
            name: 'deadline_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'submitted_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'graded_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'question_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'correct_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'score_percent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'passed',
            type: 'bit',
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
      'exam_attempts',
      new TableIndex({
        name: 'IX_exam_attempts_exam_assignment_id_status',
        columnNames: ['exam_assignment_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'exam_attempts',
      new TableIndex({
        name: 'IX_exam_attempts_enrollment_id_exam_assignment_id',
        columnNames: ['enrollment_id', 'exam_assignment_id'],
      }),
    );

    await queryRunner.createIndex(
      'exam_attempts',
      new TableIndex({
        name: 'IX_exam_attempts_student_id',
        columnNames: ['student_id'],
      }),
    );

    await queryRunner.createIndex(
      'exam_attempts',
      new TableIndex({
        name: 'UQ_exam_attempts_enrollment_id_exam_assignment_id_attempt_number',
        columnNames: ['enrollment_id', 'exam_assignment_id', 'attempt_number'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_exam_attempts_enrollment_id_exam_assignment_id_client_request_id]
      ON [exam_attempts] ([enrollment_id], [exam_assignment_id], [client_request_id])
      WHERE [client_request_id] IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_exam_attempts_enrollment_id_exam_assignment_id_in_progress]
      ON [exam_attempts] ([enrollment_id], [exam_assignment_id])
      WHERE [status] = 'IN_PROGRESS'
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempts]
      ADD CONSTRAINT [CK_exam_attempts_status]
      CHECK ([status] IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempts]
      ADD CONSTRAINT [CK_exam_attempts_auto_submit_reason]
      CHECK (
        [auto_submit_reason] IS NULL
        OR [auto_submit_reason] IN ('LEARNER_SUBMIT', 'TIME_EXPIRED', 'ASSIGNMENT_CLOSED')
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempts]
      ADD CONSTRAINT [CK_exam_attempts_attempt_number]
      CHECK ([attempt_number] >= 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempts]
      ADD CONSTRAINT [CK_exam_attempts_status_timestamps]
      CHECK (
        ([status] = 'IN_PROGRESS' AND [submitted_at] IS NULL AND [graded_at] IS NULL)
        OR
        ([status] = 'SUBMITTED' AND [submitted_at] IS NOT NULL AND [graded_at] IS NULL)
        OR
        ([status] = 'GRADED' AND [submitted_at] IS NOT NULL AND [graded_at] IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempts]
      ADD CONSTRAINT [CK_exam_attempts_graded_results]
      CHECK (
        ([status] <> 'GRADED')
        OR (
          [graded_at] IS NOT NULL
          AND [question_count] IS NOT NULL
          AND [correct_count] IS NOT NULL
          AND [score_percent] IS NOT NULL
          AND [question_count] >= 1
          AND [correct_count] >= 0
          AND [correct_count] <= [question_count]
          AND [score_percent] >= 0
          AND [score_percent] <= 100
        )
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempts]
      ADD CONSTRAINT [CK_exam_attempts_deadline_after_start]
      CHECK ([deadline_at] >= [started_at])
    `);

    await queryRunner.createForeignKey(
      'exam_attempts',
      new TableForeignKey({
        name: 'FK_exam_attempts_exam_assignment_id_exam_assignments_id',
        columnNames: ['exam_assignment_id'],
        referencedTableName: 'exam_assignments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_attempts',
      new TableForeignKey({
        name: 'FK_exam_attempts_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_attempts',
      new TableForeignKey({
        name: 'FK_exam_attempts_started_by_user_id_users_id',
        columnNames: ['started_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_attempt_questions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'exam_attempt_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'question_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'question_version_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'sort_order',
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
            name: 'translation_revision_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'delivered_locale',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'source_content_hash',
            type: 'char',
            length: '64',
            isNullable: false,
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
      'exam_attempt_questions',
      new TableIndex({
        name: 'IX_exam_attempt_questions_exam_attempt_id',
        columnNames: ['exam_attempt_id'],
      }),
    );

    await queryRunner.createIndex(
      'exam_attempt_questions',
      new TableIndex({
        name: 'UQ_exam_attempt_questions_exam_attempt_id_sort_order',
        columnNames: ['exam_attempt_id', 'sort_order'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'exam_attempt_questions',
      new TableIndex({
        name: 'UQ_exam_attempt_questions_exam_attempt_id_question_version_id',
        columnNames: ['exam_attempt_id', 'question_version_id'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [exam_attempt_questions]
      ADD CONSTRAINT [CK_exam_attempt_questions_sort_order]
      CHECK ([sort_order] >= 1)
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempt_questions]
      ADD CONSTRAINT [CK_exam_attempt_questions_delivered_option_order_json]
      CHECK (
        [delivered_option_order_json] IS NULL
        OR ISJSON([delivered_option_order_json]) = 1
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [exam_attempt_questions]
      ADD CONSTRAINT [CK_exam_attempt_questions_source_content_hash_format]
      CHECK (
        LEN([source_content_hash]) = 64
        AND [source_content_hash] NOT LIKE '%[^0-9a-f]%'
      )
    `);

    await queryRunner.createForeignKey(
      'exam_attempt_questions',
      new TableForeignKey({
        name: 'FK_exam_attempt_questions_exam_attempt_id_exam_attempts_id',
        columnNames: ['exam_attempt_id'],
        referencedTableName: 'exam_attempts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'exam_attempt_answers',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'exam_attempt_question_id',
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
            name: 'saved_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'saved_by_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'client_answer_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'exam_attempt_answers',
      new TableIndex({
        name: 'IX_exam_attempt_answers_exam_attempt_question_id',
        columnNames: ['exam_attempt_question_id'],
      }),
    );

    await queryRunner.createIndex(
      'exam_attempt_answers',
      new TableIndex({
        name: 'UQ_exam_attempt_answers_exam_attempt_question_id',
        columnNames: ['exam_attempt_question_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'exam_attempt_answers',
      new TableIndex({
        name: 'UQ_exam_attempt_answers_exam_attempt_question_id_client_answer_id',
        columnNames: ['exam_attempt_question_id', 'client_answer_id'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [exam_attempt_answers]
      ADD CONSTRAINT [CK_exam_attempt_answers_selected_option_ids_json]
      CHECK (ISJSON([selected_option_ids_json]) = 1)
    `);

    await queryRunner.createForeignKey(
      'exam_attempt_answers',
      new TableForeignKey({
        name: 'FK_exam_attempt_answers_exam_attempt_question_id_exam_attempt_questions_id',
        columnNames: ['exam_attempt_question_id'],
        referencedTableName: 'exam_attempt_questions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'exam_attempt_answers',
      new TableForeignKey({
        name: 'FK_exam_attempt_answers_saved_by_user_id_users_id',
        columnNames: ['saved_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('exam_attempt_answers', true, true, true);
    await queryRunner.dropTable('exam_attempt_questions', true, true, true);
    await queryRunner.dropTable('exam_attempts', true, true, true);
    await queryRunner.dropTable('exam_assignments', true, true, true);
    await queryRunner.dropTable('exam_version_questions', true, true, true);
    await queryRunner.dropTable('exam_versions', true, true, true);
    await queryRunner.dropTable('exams', true, true, true);
  }
}
