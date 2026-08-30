import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClassPeopleEnrollmentSchema1788063000000 implements MigrationInterface {
  name = 'CreateClassPeopleEnrollmentSchema1788063000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'parish_memberships',
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
            name: 'user_id',
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
            name: 'joined_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'ended_at',
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
      'parish_memberships',
      new TableIndex({
        name: 'IX_parish_memberships_user_id_status',
        columnNames: ['user_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'parish_memberships',
      new TableIndex({
        name: 'IX_parish_memberships_parish_id_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.createForeignKey(
      'parish_memberships',
      new TableForeignKey({
        name: 'FK_parish_memberships_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'parish_memberships',
      new TableForeignKey({
        name: 'FK_parish_memberships_user_id_users_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_parish_memberships_parish_id_user_id_active]
      ON [parish_memberships] ([parish_id], [user_id])
      WHERE [status] = 'ACTIVE'
    `);

    await queryRunner.query(`
      ALTER TABLE [parish_memberships]
      ADD CONSTRAINT [CK_parish_memberships_status_ended_at]
      CHECK (
        ([status] = 'ACTIVE' AND [ended_at] IS NULL)
        OR ([status] = 'ENDED' AND [ended_at] IS NOT NULL)
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'students',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uniqueidentifier',
            isNullable: true,
          },
          {
            name: 'full_name',
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

    await queryRunner.createForeignKey(
      'students',
      new TableForeignKey({
        name: 'FK_students_user_id_users_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_students_user_id]
      ON [students] ([user_id])
      WHERE [user_id] IS NOT NULL
    `);

    await queryRunner.createTable(
      new Table({
        name: 'student_guardians',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'student_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'guardian_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'relationship_type',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'is_primary',
            type: 'bit',
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'starts_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'ends_at',
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

    await queryRunner.createForeignKey(
      'student_guardians',
      new TableForeignKey({
        name: 'FK_student_guardians_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'student_guardians',
      new TableForeignKey({
        name: 'FK_student_guardians_guardian_user_id_users_id',
        columnNames: ['guardian_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_student_guardians_student_id_guardian_user_id_active]
      ON [student_guardians] ([student_id], [guardian_user_id])
      WHERE [status] = 'ACTIVE'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_student_guardians_student_id_primary_active]
      ON [student_guardians] ([student_id])
      WHERE [is_primary] = 1 AND [status] = 'ACTIVE'
    `);

    await queryRunner.query(`
      ALTER TABLE [student_guardians]
      ADD CONSTRAINT [CK_student_guardians_status_ends_at]
      CHECK (
        ([status] = 'ACTIVE' AND [ends_at] IS NULL)
        OR ([status] = 'ENDED' AND [ends_at] IS NOT NULL)
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'classes',
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
      'classes',
      new TableIndex({
        name: 'IX_classes_parish_id_academic_year_id',
        columnNames: ['parish_id', 'academic_year_id'],
      }),
    );

    await queryRunner.createIndex(
      'classes',
      new TableIndex({
        name: 'IX_classes_parish_id_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'classes',
      new TableIndex({
        name: 'IX_classes_academic_year_id',
        columnNames: ['academic_year_id'],
      }),
    );

    await queryRunner.createIndex(
      'classes',
      new TableIndex({
        name: 'IX_classes_catechism_level_id',
        columnNames: ['catechism_level_id'],
      }),
    );

    await queryRunner.createIndex(
      'classes',
      new TableIndex({
        name: 'UQ_classes_parish_id_academic_year_id_code',
        columnNames: ['parish_id', 'academic_year_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'classes',
      new TableForeignKey({
        name: 'FK_classes_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'classes',
      new TableForeignKey({
        name: 'FK_classes_academic_year_id_academic_years_id',
        columnNames: ['academic_year_id'],
        referencedTableName: 'academic_years',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'classes',
      new TableForeignKey({
        name: 'FK_classes_catechism_level_id_catechism_levels_id',
        columnNames: ['catechism_level_id'],
        referencedTableName: 'catechism_levels',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'class_catechist_assignments',
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
            name: 'catechist_user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'assignment_role',
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
            name: 'assigned_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'ended_at',
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
      'class_catechist_assignments',
      new TableIndex({
        name: 'IX_class_catechist_assignments_class_id_status',
        columnNames: ['class_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'class_catechist_assignments',
      new TableIndex({
        name: 'IX_class_catechist_assignments_catechist_user_id_status',
        columnNames: ['catechist_user_id', 'status'],
      }),
    );

    await queryRunner.createForeignKey(
      'class_catechist_assignments',
      new TableForeignKey({
        name: 'FK_class_catechist_assignments_class_id_classes_id',
        columnNames: ['class_id'],
        referencedTableName: 'classes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'class_catechist_assignments',
      new TableForeignKey({
        name: 'FK_class_catechist_assignments_catechist_user_id_users_id',
        columnNames: ['catechist_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_class_catechist_assignments_class_id_user_id_active]
      ON [class_catechist_assignments] ([class_id], [catechist_user_id])
      WHERE [status] = 'ACTIVE'
    `);

    await queryRunner.query(`
      ALTER TABLE [class_catechist_assignments]
      ADD CONSTRAINT [CK_class_catechist_assignments_status_ended_at]
      CHECK (
        ([status] = 'ACTIVE' AND [ended_at] IS NULL)
        OR ([status] = 'ENDED' AND [ended_at] IS NOT NULL)
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'enrollments',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
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
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'enrolled_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'left_at',
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
      'enrollments',
      new TableIndex({
        name: 'IX_enrollments_class_id_status',
        columnNames: ['class_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IX_enrollments_student_id',
        columnNames: ['student_id'],
      }),
    );

    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IX_enrollments_parish_id_academic_year_id',
        columnNames: ['parish_id', 'academic_year_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'enrollments',
      new TableForeignKey({
        name: 'FK_enrollments_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'enrollments',
      new TableForeignKey({
        name: 'FK_enrollments_class_id_classes_id',
        columnNames: ['class_id'],
        referencedTableName: 'classes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'enrollments',
      new TableForeignKey({
        name: 'FK_enrollments_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'enrollments',
      new TableForeignKey({
        name: 'FK_enrollments_academic_year_id_academic_years_id',
        columnNames: ['academic_year_id'],
        referencedTableName: 'academic_years',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_enrollments_student_id_academic_year_id_parish_id_active]
      ON [enrollments] ([student_id], [academic_year_id], [parish_id])
      WHERE [status] = 'ACTIVE'
    `);

    await queryRunner.query(`
      ALTER TABLE [enrollments]
      ADD CONSTRAINT [CK_enrollments_status_left_at]
      CHECK (
        ([status] = 'ACTIVE' AND [left_at] IS NULL)
        OR ([status] IN ('COMPLETED', 'WITHDRAWN', 'TRANSFERRED') AND [left_at] IS NOT NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enrollments', true);
    await queryRunner.dropTable('class_catechist_assignments', true);
    await queryRunner.dropTable('classes', true);
    await queryRunner.dropTable('student_guardians', true);
    await queryRunner.dropTable('students', true);
    await queryRunner.dropTable('parish_memberships', true);
  }
}
