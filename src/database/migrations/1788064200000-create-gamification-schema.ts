import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Gamification persistence foundation — 9 tables.
 * Creation order satisfies own-module FKs; rollback reverses.
 */
export class CreateGamificationSchema1788064200000 implements MigrationInterface {
  name = 'CreateGamificationSchema1788064200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. reward_rules
    await queryRunner.createTable(
      new Table({
        name: 'reward_rules',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '128', isNullable: false },
          { name: 'event_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'source_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'points', type: 'int', isNullable: false },
          { name: 'status', type: 'varchar', length: '16', isNullable: false },
          { name: 'max_awards_per_source', type: 'int', isNullable: false, default: 1 },
          { name: 'scope_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'effective_from', type: 'datetime2', isNullable: true },
          { name: 'effective_to', type: 'datetime2', isNullable: true },
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
      'reward_rules',
      new TableIndex({
        name: 'UQ_reward_rules_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'reward_rules',
      new TableIndex({
        name: 'IX_reward_rules_event_type_status',
        columnNames: ['event_type', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'reward_rules',
      new TableIndex({
        name: 'IX_reward_rules_parish_id',
        columnNames: ['parish_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD CONSTRAINT [CK_reward_rules_status]
      CHECK ([status] IN ('ACTIVE', 'INACTIVE'))
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD CONSTRAINT [CK_reward_rules_scope_type]
      CHECK ([scope_type] IN ('GLOBAL', 'PARISH'))
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD CONSTRAINT [CK_reward_rules_scope_parish]
      CHECK (
        ([scope_type] = 'GLOBAL' AND [parish_id] IS NULL)
        OR ([scope_type] = 'PARISH' AND [parish_id] IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD CONSTRAINT [CK_reward_rules_points]
      CHECK ([points] >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD CONSTRAINT [CK_reward_rules_max_awards_per_source]
      CHECK ([max_awards_per_source] > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD CONSTRAINT [CK_reward_rules_effective_range]
      CHECK (
        [effective_from] IS NULL
        OR [effective_to] IS NULL
        OR [effective_to] > [effective_from]
      )
    `);

    await queryRunner.createForeignKey(
      'reward_rules',
      new TableForeignKey({
        name: 'FK_reward_rules_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    // 2. processed_reward_events
    await queryRunner.createTable(
      new Table({
        name: 'processed_reward_events',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'event_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'event_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'student_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'source_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'processed_at', type: 'datetime2', isNullable: false },
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
      'processed_reward_events',
      new TableIndex({
        name: 'UQ_processed_reward_events_event_id',
        columnNames: ['event_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'processed_reward_events',
      new TableIndex({
        name: 'IX_processed_reward_events_student_id_processed_at',
        columnNames: ['student_id', 'processed_at'],
      }),
    );

    await queryRunner.createForeignKey(
      'processed_reward_events',
      new TableForeignKey({
        name: 'FK_processed_reward_events_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    // 3. point_ledger_entries
    await queryRunner.createTable(
      new Table({
        name: 'point_ledger_entries',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'student_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'enrollment_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'academic_year_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'points_delta', type: 'int', isNullable: false },
          { name: 'source_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'source_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'reason_code', type: 'varchar', length: '128', isNullable: false },
          { name: 'description_key', type: 'nvarchar', length: '256', isNullable: true },
          { name: 'staff_note', type: 'nvarchar', length: '500', isNullable: true },
          { name: 'awarded_by_user_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'related_ledger_entry_id', type: 'uniqueidentifier', isNullable: true },
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
      'point_ledger_entries',
      new TableIndex({
        name: 'UQ_point_ledger_entries_student_source_reason',
        columnNames: ['student_id', 'source_type', 'source_id', 'reason_code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'point_ledger_entries',
      new TableIndex({
        name: 'IX_point_ledger_entries_student_id_created_at',
        columnNames: ['student_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'point_ledger_entries',
      new TableIndex({
        name: 'IX_point_ledger_entries_parish_id_created_at',
        columnNames: ['parish_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'point_ledger_entries',
      new TableIndex({
        name: 'IX_point_ledger_entries_source_type_source_id',
        columnNames: ['source_type', 'source_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [point_ledger_entries]
      ADD CONSTRAINT [CK_point_ledger_entries_points_delta_nonzero]
      CHECK ([points_delta] <> 0)
    `);

    await queryRunner.createForeignKey(
      'point_ledger_entries',
      new TableForeignKey({
        name: 'FK_point_ledger_entries_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'point_ledger_entries',
      new TableForeignKey({
        name: 'FK_point_ledger_entries_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'point_ledger_entries',
      new TableForeignKey({
        name: 'FK_point_ledger_entries_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'point_ledger_entries',
      new TableForeignKey({
        name: 'FK_point_ledger_entries_academic_year_id_academic_years_id',
        columnNames: ['academic_year_id'],
        referencedTableName: 'academic_years',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'point_ledger_entries',
      new TableForeignKey({
        name: 'FK_point_ledger_entries_awarded_by_user_id_users_id',
        columnNames: ['awarded_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'point_ledger_entries',
      new TableForeignKey({
        name: 'FK_point_ledger_entries_related_ledger_entry_id',
        columnNames: ['related_ledger_entry_id'],
        referencedTableName: 'point_ledger_entries',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    // 4. badge_definitions
    await queryRunner.createTable(
      new Table({
        name: 'badge_definitions',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '64', isNullable: false },
          { name: 'name', type: 'nvarchar', length: '128', isNullable: false },
          { name: 'description', type: 'nvarchar', length: '500', isNullable: true },
          { name: 'category', type: 'varchar', length: '64', isNullable: false },
          { name: 'scope_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'status', type: 'varchar', length: '16', isNullable: false },
          { name: 'award_mode', type: 'varchar', length: '16', isNullable: false },
          { name: 'rule_event_type', type: 'varchar', length: '64', isNullable: true },
          { name: 'rule_config_json', type: 'nvarchar', length: 'max', isNullable: true },
          { name: 'points_bonus', type: 'int', isNullable: true },
          { name: 'icon_media_asset_id', type: 'uniqueidentifier', isNullable: true },
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
      'badge_definitions',
      new TableIndex({
        name: 'UQ_badge_definitions_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'badge_definitions',
      new TableIndex({
        name: 'IX_badge_definitions_status_scope',
        columnNames: ['status', 'scope_type'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [badge_definitions]
      ADD CONSTRAINT [CK_badge_definitions_status]
      CHECK ([status] IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [badge_definitions]
      ADD CONSTRAINT [CK_badge_definitions_award_mode]
      CHECK ([award_mode] IN ('AUTOMATIC', 'MANUAL', 'BOTH'))
    `);

    await queryRunner.query(`
      ALTER TABLE [badge_definitions]
      ADD CONSTRAINT [CK_badge_definitions_scope_type]
      CHECK ([scope_type] IN ('GLOBAL', 'PARISH'))
    `);

    await queryRunner.query(`
      ALTER TABLE [badge_definitions]
      ADD CONSTRAINT [CK_badge_definitions_scope_parish]
      CHECK (
        ([scope_type] = 'GLOBAL' AND [parish_id] IS NULL)
        OR ([scope_type] = 'PARISH' AND [parish_id] IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [badge_definitions]
      ADD CONSTRAINT [CK_badge_definitions_points_bonus]
      CHECK ([points_bonus] IS NULL OR [points_bonus] >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [badge_definitions]
      ADD CONSTRAINT [CK_badge_definitions_rule_config_json]
      CHECK ([rule_config_json] IS NULL OR ISJSON([rule_config_json]) = 1)
    `);

    await queryRunner.createForeignKey(
      'badge_definitions',
      new TableForeignKey({
        name: 'FK_badge_definitions_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    // 5. badge_awards
    await queryRunner.createTable(
      new Table({
        name: 'badge_awards',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'badge_definition_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'student_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'enrollment_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'awarded_at', type: 'datetime2', isNullable: false },
          { name: 'source_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'source_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'awarded_by_user_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'revoked_at', type: 'datetime2', isNullable: true },
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

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_badge_awards_active_definition_student]
      ON [badge_awards] ([badge_definition_id], [student_id])
      WHERE [revoked_at] IS NULL
    `);

    await queryRunner.createIndex(
      'badge_awards',
      new TableIndex({
        name: 'IX_badge_awards_student_id_awarded_at',
        columnNames: ['student_id', 'awarded_at'],
      }),
    );

    await queryRunner.createIndex(
      'badge_awards',
      new TableIndex({
        name: 'IX_badge_awards_parish_id',
        columnNames: ['parish_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'badge_awards',
      new TableForeignKey({
        name: 'FK_badge_awards_badge_definition_id',
        columnNames: ['badge_definition_id'],
        referencedTableName: 'badge_definitions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'badge_awards',
      new TableForeignKey({
        name: 'FK_badge_awards_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'badge_awards',
      new TableForeignKey({
        name: 'FK_badge_awards_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'badge_awards',
      new TableForeignKey({
        name: 'FK_badge_awards_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'badge_awards',
      new TableForeignKey({
        name: 'FK_badge_awards_awarded_by_user_id_users_id',
        columnNames: ['awarded_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    // 6. mission_definitions
    await queryRunner.createTable(
      new Table({
        name: 'mission_definitions',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '64', isNullable: false },
          { name: 'name', type: 'nvarchar', length: '128', isNullable: false },
          { name: 'description', type: 'nvarchar', length: '500', isNullable: true },
          { name: 'status', type: 'varchar', length: '16', isNullable: false },
          { name: 'scope_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'class_id', type: 'uniqueidentifier', isNullable: true },
          {
            name: 'scope_key',
            type: 'varchar',
            length: '80',
            isNullable: false,
          },
          { name: 'condition_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'target_count', type: 'int', isNullable: false },
          { name: 'points_bonus', type: 'int', isNullable: true },
          { name: 'starts_at', type: 'datetime2', isNullable: true },
          { name: 'ends_at', type: 'datetime2', isNullable: true },
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
      'mission_definitions',
      new TableIndex({
        name: 'UQ_mission_definitions_scope_key_code',
        columnNames: ['scope_key', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'mission_definitions',
      new TableIndex({
        name: 'IX_mission_definitions_status_scope',
        columnNames: ['status', 'scope_type'],
      }),
    );

    await queryRunner.createIndex(
      'mission_definitions',
      new TableIndex({
        name: 'IX_mission_definitions_class_id',
        columnNames: ['class_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [mission_definitions]
      ADD CONSTRAINT [CK_mission_definitions_status]
      CHECK ([status] IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_definitions]
      ADD CONSTRAINT [CK_mission_definitions_scope_type]
      CHECK ([scope_type] IN ('GLOBAL', 'PARISH', 'CLASS'))
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_definitions]
      ADD CONSTRAINT [CK_mission_definitions_condition_type]
      CHECK ([condition_type] IN (
        'LESSONS_COMPLETED',
        'PRACTICE_COMPLETED',
        'ATTENDANCE_PRESENT_OR_LATE',
        'EXAMS_COMPLETED'
      ))
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_definitions]
      ADD CONSTRAINT [CK_mission_definitions_scope_consistency]
      CHECK (
        (
          [scope_type] = 'GLOBAL'
          AND [parish_id] IS NULL
          AND [class_id] IS NULL
          AND [scope_key] = 'GLOBAL'
        )
        OR (
          [scope_type] = 'PARISH'
          AND [parish_id] IS NOT NULL
          AND [class_id] IS NULL
          AND [scope_key] LIKE 'PARISH:%'
        )
        OR (
          [scope_type] = 'CLASS'
          AND [parish_id] IS NOT NULL
          AND [class_id] IS NOT NULL
          AND [scope_key] LIKE 'CLASS:%'
        )
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_definitions]
      ADD CONSTRAINT [CK_mission_definitions_target_count]
      CHECK ([target_count] > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_definitions]
      ADD CONSTRAINT [CK_mission_definitions_points_bonus]
      CHECK ([points_bonus] IS NULL OR [points_bonus] >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_definitions]
      ADD CONSTRAINT [CK_mission_definitions_date_range]
      CHECK (
        [starts_at] IS NULL
        OR [ends_at] IS NULL
        OR [ends_at] > [starts_at]
      )
    `);

    await queryRunner.createForeignKey(
      'mission_definitions',
      new TableForeignKey({
        name: 'FK_mission_definitions_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'mission_definitions',
      new TableForeignKey({
        name: 'FK_mission_definitions_class_id_classes_id',
        columnNames: ['class_id'],
        referencedTableName: 'classes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    // 7. mission_progress
    await queryRunner.createTable(
      new Table({
        name: 'mission_progress',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'mission_definition_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'student_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'enrollment_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'current_count', type: 'int', isNullable: false },
          { name: 'target_count', type: 'int', isNullable: false },
          { name: 'status', type: 'varchar', length: '16', isNullable: false },
          { name: 'completed_at', type: 'datetime2', isNullable: true },
          { name: 'last_event_id', type: 'uniqueidentifier', isNullable: true },
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
      'mission_progress',
      new TableIndex({
        name: 'UQ_mission_progress_mission_definition_id_student_id',
        columnNames: ['mission_definition_id', 'student_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'mission_progress',
      new TableIndex({
        name: 'IX_mission_progress_student_id_status',
        columnNames: ['student_id', 'status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [mission_progress]
      ADD CONSTRAINT [CK_mission_progress_status]
      CHECK ([status] IN ('ACTIVE', 'COMPLETED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_progress]
      ADD CONSTRAINT [CK_mission_progress_counts]
      CHECK (
        [current_count] >= 0
        AND [target_count] > 0
        AND [current_count] <= [target_count]
      )
    `);

    await queryRunner.query(`
      ALTER TABLE [mission_progress]
      ADD CONSTRAINT [CK_mission_progress_completed_at]
      CHECK (
        ([status] = 'COMPLETED' AND [completed_at] IS NOT NULL)
        OR ([status] = 'ACTIVE' AND [completed_at] IS NULL)
      )
    `);

    await queryRunner.createForeignKey(
      'mission_progress',
      new TableForeignKey({
        name: 'FK_mission_progress_mission_definition_id',
        columnNames: ['mission_definition_id'],
        referencedTableName: 'mission_definitions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'mission_progress',
      new TableForeignKey({
        name: 'FK_mission_progress_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'mission_progress',
      new TableForeignKey({
        name: 'FK_mission_progress_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    // 8. milestone_definitions
    await queryRunner.createTable(
      new Table({
        name: 'milestone_definitions',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '64', isNullable: false },
          { name: 'name', type: 'nvarchar', length: '128', isNullable: false },
          { name: 'description', type: 'nvarchar', length: '500', isNullable: true },
          { name: 'status', type: 'varchar', length: '16', isNullable: false },
          { name: 'trigger_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'trigger_config_json', type: 'nvarchar', length: 'max', isNullable: true },
          { name: 'sort_order', type: 'int', isNullable: false, default: 0 },
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
      'milestone_definitions',
      new TableIndex({
        name: 'UQ_milestone_definitions_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'milestone_definitions',
      new TableIndex({
        name: 'IX_milestone_definitions_status_sort_order',
        columnNames: ['status', 'sort_order'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [milestone_definitions]
      ADD CONSTRAINT [CK_milestone_definitions_status]
      CHECK ([status] IN ('ACTIVE', 'ARCHIVED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [milestone_definitions]
      ADD CONSTRAINT [CK_milestone_definitions_trigger_type]
      CHECK ([trigger_type] IN (
        'FIRST_LESSON_COMPLETED',
        'LESSONS_COMPLETED_COUNT',
        'ATTENDANCE_COUNT',
        'FIRST_EXAM_COMPLETED',
        'FIRST_MISSION_COMPLETED'
      ))
    `);

    await queryRunner.query(`
      ALTER TABLE [milestone_definitions]
      ADD CONSTRAINT [CK_milestone_definitions_trigger_config_json]
      CHECK ([trigger_config_json] IS NULL OR ISJSON([trigger_config_json]) = 1)
    `);

    // 9. milestone_achievements
    await queryRunner.createTable(
      new Table({
        name: 'milestone_achievements',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'milestone_definition_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'student_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'enrollment_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'achieved_at', type: 'datetime2', isNullable: false },
          { name: 'source_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'source_id', type: 'uniqueidentifier', isNullable: false },
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
      'milestone_achievements',
      new TableIndex({
        name: 'UQ_milestone_achievements_definition_student',
        columnNames: ['milestone_definition_id', 'student_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'milestone_achievements',
      new TableIndex({
        name: 'IX_milestone_achievements_student_id_achieved_at',
        columnNames: ['student_id', 'achieved_at'],
      }),
    );

    await queryRunner.createForeignKey(
      'milestone_achievements',
      new TableForeignKey({
        name: 'FK_milestone_achievements_milestone_definition_id',
        columnNames: ['milestone_definition_id'],
        referencedTableName: 'milestone_definitions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'milestone_achievements',
      new TableForeignKey({
        name: 'FK_milestone_achievements_student_id_students_id',
        columnNames: ['student_id'],
        referencedTableName: 'students',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'milestone_achievements',
      new TableForeignKey({
        name: 'FK_milestone_achievements_enrollment_id_enrollments_id',
        columnNames: ['enrollment_id'],
        referencedTableName: 'enrollments',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'milestone_achievements',
      new TableForeignKey({
        name: 'FK_milestone_achievements_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('milestone_achievements', true);
    await queryRunner.dropTable('milestone_definitions', true);
    await queryRunner.dropTable('mission_progress', true);
    await queryRunner.dropTable('mission_definitions', true);
    await queryRunner.dropTable('badge_awards', true);
    await queryRunner.dropTable('badge_definitions', true);
    await queryRunner.dropTable('point_ledger_entries', true);
    await queryRunner.dropTable('processed_reward_events', true);
    await queryRunner.dropTable('reward_rules', true);
  }
}
