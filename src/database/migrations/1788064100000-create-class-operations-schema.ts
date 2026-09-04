import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClassOperationsSchema1788064100000 implements MigrationInterface {
  name = 'CreateClassOperationsSchema1788064100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'class_sessions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
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
            name: 'title',
            type: 'nvarchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'starts_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'ends_at',
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
            name: 'cancelled_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'updated_by_user_id',
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
      'class_sessions',
      new TableIndex({
        name: 'IX_class_sessions_class_id_starts_at',
        columnNames: ['class_id', 'starts_at'],
      }),
    );

    await queryRunner.createIndex(
      'class_sessions',
      new TableIndex({
        name: 'IX_class_sessions_parish_id_starts_at',
        columnNames: ['parish_id', 'starts_at'],
      }),
    );

    await queryRunner.createIndex(
      'class_sessions',
      new TableIndex({
        name: 'IX_class_sessions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [class_sessions]
      ADD CONSTRAINT [CK_class_sessions_status]
      CHECK ([status] IN ('SCHEDULED', 'COMPLETED', 'CANCELLED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [class_sessions]
      ADD CONSTRAINT [CK_class_sessions_ends_at_after_starts_at]
      CHECK ([ends_at] > [starts_at])
    `);

    await queryRunner.query(`
      ALTER TABLE [class_sessions]
      ADD CONSTRAINT [CK_class_sessions_cancelled_at]
      CHECK (
        ([status] = 'CANCELLED' AND [cancelled_at] IS NOT NULL)
        OR ([status] <> 'CANCELLED' AND [cancelled_at] IS NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [class_sessions]
      ADD CONSTRAINT [CK_class_sessions_completed_at]
      CHECK (
        ([status] = 'COMPLETED' AND [completed_at] IS NOT NULL)
        OR ([status] <> 'COMPLETED' AND [completed_at] IS NULL)
      )
    `);

    await queryRunner.createForeignKey(
      'class_sessions',
      new TableForeignKey({
        name: 'FK_class_sessions_class_id_classes_id',
        columnNames: ['class_id'],
        referencedTableName: 'classes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'class_sessions',
      new TableForeignKey({
        name: 'FK_class_sessions_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'class_sessions',
      new TableForeignKey({
        name: 'FK_class_sessions_academic_year_id_academic_years_id',
        columnNames: ['academic_year_id'],
        referencedTableName: 'academic_years',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'class_sessions',
      new TableForeignKey({
        name: 'FK_class_sessions_created_by_user_id_users_id',
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'class_sessions',
      new TableForeignKey({
        name: 'FK_class_sessions_updated_by_user_id_users_id',
        columnNames: ['updated_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'class_session_roster',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'session_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'enrollment_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'student_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'display_name_snapshot',
            type: 'nvarchar',
            length: '128',
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
      'class_session_roster',
      new TableIndex({
        name: 'UQ_class_session_roster_session_id_enrollment_id',
        columnNames: ['session_id', 'enrollment_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'class_session_roster',
      new TableIndex({
        name: 'IX_class_session_roster_session_id',
        columnNames: ['session_id'],
      }),
    );

    await queryRunner.createIndex(
      'class_session_roster',
      new TableIndex({
        name: 'IX_class_session_roster_enrollment_id',
        columnNames: ['enrollment_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'class_session_roster',
      new TableForeignKey({
        name: 'FK_class_session_roster_session_id_class_sessions_id',
        columnNames: ['session_id'],
        referencedTableName: 'class_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'class_session_roster',
      new TableForeignKey({
        name: 'FK_class_session_roster_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'class_session_roster',
      new TableForeignKey({
        name: 'FK_class_session_roster_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'attendance_records',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'session_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'enrollment_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'student_id',
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
            name: 'note',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'marked_by_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'marked_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'updated_by_user_id',
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
      'attendance_records',
      new TableIndex({
        name: 'UQ_attendance_records_session_id_enrollment_id',
        columnNames: ['session_id', 'enrollment_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'attendance_records',
      new TableIndex({
        name: 'IX_attendance_records_session_id',
        columnNames: ['session_id'],
      }),
    );

    await queryRunner.createIndex(
      'attendance_records',
      new TableIndex({
        name: 'IX_attendance_records_enrollment_id',
        columnNames: ['enrollment_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [attendance_records]
      ADD CONSTRAINT [CK_attendance_records_status]
      CHECK ([status] IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED'))
    `);

    await queryRunner.createForeignKey(
      'attendance_records',
      new TableForeignKey({
        name: 'FK_attendance_records_session_id_class_sessions_id',
        columnNames: ['session_id'],
        referencedTableName: 'class_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'attendance_records',
      new TableForeignKey({
        name: 'FK_attendance_records_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'attendance_records',
      new TableForeignKey({
        name: 'FK_attendance_records_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'attendance_records',
      new TableForeignKey({
        name: 'FK_attendance_records_marked_by_user_id_users_id',
        columnNames: ['marked_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'attendance_records',
      new TableForeignKey({
        name: 'FK_attendance_records_updated_by_user_id_users_id',
        columnNames: ['updated_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('attendance_records', true, true, true);
    await queryRunner.dropTable('class_session_roster', true, true, true);
    await queryRunner.dropTable('class_sessions', true, true, true);
  }
}
