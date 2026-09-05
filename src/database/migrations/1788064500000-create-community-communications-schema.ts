import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Community and Communications persistence foundation — exactly 10 tables:
 * 1. cms_entries
 * 2. announcements
 * 3. announcement_targets
 * 4. announcement_user_states
 * 5. events
 * 6. event_targets
 * 7. event_registrations
 * 8. notifications
 * 9. notification_recipients
 * 10. notification_devices
 *
 * Creation order satisfies own-module foreign keys; rollback in exact reverse order.
 */
export class CreateCommunityCommunicationsSchema1788064500000 implements MigrationInterface {
  name = 'CreateCommunityCommunicationsSchema1788064500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------------
    // 1. cms_entries
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'cms_entries',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'type', type: 'varchar', length: '32', isNullable: false },
          { name: 'scope_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'scope_key', type: 'varchar', length: '64', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'slug', type: 'varchar', length: '128', isNullable: false },
          { name: 'title', type: 'nvarchar', length: '200', isNullable: false },
          { name: 'summary', type: 'nvarchar', length: '1000', isNullable: true },
          { name: 'body', type: 'nvarchar', length: 'max', isNullable: false },
          { name: 'locale', type: 'varchar', length: '32', default: "'vi-VN'", isNullable: false },
          { name: 'status', type: 'varchar', length: '16', default: "'DRAFT'", isNullable: false },
          { name: 'cover_media_asset_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'is_featured', type: 'bit', default: '0', isNullable: false },
          { name: 'scheduled_for', type: 'datetime2', isNullable: true },
          { name: 'published_at', type: 'datetime2', isNullable: true },
          { name: 'expires_at', type: 'datetime2', isNullable: true },
          { name: 'created_by_user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'updated_by_user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'updated_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'cms_entries',
      new TableIndex({
        name: 'UQ_cms_entries_scope_slug',
        columnNames: ['scope_key', 'slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'cms_entries',
      new TableIndex({
        name: 'IX_cms_entries_status_published',
        columnNames: ['status', 'published_at'],
      }),
    );

    await queryRunner.createIndex(
      'cms_entries',
      new TableIndex({
        name: 'IX_cms_entries_scope_key_status',
        columnNames: ['scope_key', 'status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [cms_entries]
      ADD CONSTRAINT [CK_cms_entries_type]
      CHECK ([type] IN ('PAGE', 'ARTICLE', 'NEWS'))
    `);

    await queryRunner.query(`
      ALTER TABLE [cms_entries]
      ADD CONSTRAINT [CK_cms_entries_scope_type]
      CHECK ([scope_type] IN ('GLOBAL', 'PARISH'))
    `);

    await queryRunner.query(`
      ALTER TABLE [cms_entries]
      ADD CONSTRAINT [CK_cms_entries_status]
      CHECK ([status] IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'))
    `);

    // -------------------------------------------------------------------------
    // 2. announcements
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'announcements',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'title', type: 'nvarchar', length: '200', isNullable: false },
          { name: 'body', type: 'nvarchar', length: 'max', isNullable: false },
          { name: 'summary', type: 'nvarchar', length: '1000', isNullable: true },
          { name: 'locale', type: 'varchar', length: '32', default: "'vi-VN'", isNullable: false },
          { name: 'priority', type: 'varchar', length: '16', default: "'NORMAL'", isNullable: false },
          { name: 'status', type: 'varchar', length: '16', default: "'DRAFT'", isNullable: false },
          { name: 'scope_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'starts_at', type: 'datetime2', isNullable: false },
          { name: 'ends_at', type: 'datetime2', isNullable: true },
          { name: 'is_pinned', type: 'bit', default: '0', isNullable: false },
          { name: 'cover_media_asset_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'published_at', type: 'datetime2', isNullable: true },
          { name: 'created_by_user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'updated_by_user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'updated_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'announcements',
      new TableIndex({
        name: 'IX_announcements_status_window',
        columnNames: ['status', 'starts_at', 'ends_at'],
      }),
    );

    await queryRunner.createIndex(
      'announcements',
      new TableIndex({
        name: 'IX_announcements_parish_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [announcements]
      ADD CONSTRAINT [CK_announcements_priority]
      CHECK ([priority] IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
    `);

    await queryRunner.query(`
      ALTER TABLE [announcements]
      ADD CONSTRAINT [CK_announcements_status]
      CHECK ([status] IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [announcements]
      ADD CONSTRAINT [CK_announcements_scope_type]
      CHECK ([scope_type] IN ('GLOBAL', 'PARISH'))
    `);

    // -------------------------------------------------------------------------
    // 3. announcement_targets
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'announcement_targets',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'announcement_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'target_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'class_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'role_code', type: 'varchar', length: '64', isNullable: true },
          { name: 'target_key', type: 'varchar', length: '128', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'announcement_targets',
      new TableForeignKey({
        name: 'FK_announcement_targets_announcement_id',
        columnNames: ['announcement_id'],
        referencedTableName: 'announcements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'announcement_targets',
      new TableIndex({
        name: 'UQ_announcement_targets_announcement_target_key',
        columnNames: ['announcement_id', 'target_key'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'announcement_targets',
      new TableIndex({
        name: 'IX_announcement_targets_lookup',
        columnNames: ['target_type', 'parish_id', 'class_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [announcement_targets]
      ADD CONSTRAINT [CK_announcement_targets_target_type]
      CHECK ([target_type] IN ('GLOBAL', 'PARISH', 'CLASS', 'ROLE'))
    `);

    // -------------------------------------------------------------------------
    // 4. announcement_user_states
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'announcement_user_states',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'announcement_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'first_seen_at', type: 'datetime2', isNullable: true },
          { name: 'read_at', type: 'datetime2', isNullable: true },
          { name: 'dismissed_at', type: 'datetime2', isNullable: true },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'updated_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'announcement_user_states',
      new TableForeignKey({
        name: 'FK_announcement_user_states_announcement_id',
        columnNames: ['announcement_id'],
        referencedTableName: 'announcements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'announcement_user_states',
      new TableIndex({
        name: 'UQ_announcement_user_states',
        columnNames: ['announcement_id', 'user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'announcement_user_states',
      new TableIndex({
        name: 'IX_announcement_user_states_user',
        columnNames: ['user_id', 'read_at'],
      }),
    );

    // -------------------------------------------------------------------------
    // 5. events
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'code', type: 'varchar', length: '64', isNullable: false },
          { name: 'title', type: 'nvarchar', length: '200', isNullable: false },
          { name: 'description', type: 'nvarchar', length: 'max', isNullable: false },
          { name: 'summary', type: 'nvarchar', length: '1000', isNullable: true },
          { name: 'locale', type: 'varchar', length: '32', default: "'vi-VN'", isNullable: false },
          { name: 'scope_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'scope_key', type: 'varchar', length: '64', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'class_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'status', type: 'varchar', length: '16', default: "'DRAFT'", isNullable: false },
          { name: 'timezone', type: 'varchar', length: '64', default: "'Asia/Ho_Chi_Minh'", isNullable: false },
          { name: 'starts_at', type: 'datetime2', isNullable: false },
          { name: 'ends_at', type: 'datetime2', isNullable: false },
          { name: 'venue_name', type: 'nvarchar', length: '200', isNullable: true },
          { name: 'address', type: 'nvarchar', length: '500', isNullable: true },
          { name: 'cover_media_asset_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'capacity', type: 'int', isNullable: true },
          { name: 'is_registration_required', type: 'bit', default: '0', isNullable: false },
          { name: 'registration_deadline', type: 'datetime2', isNullable: true },
          { name: 'published_at', type: 'datetime2', isNullable: true },
          { name: 'cancelled_at', type: 'datetime2', isNullable: true },
          { name: 'cancellation_reason', type: 'nvarchar', length: '500', isNullable: true },
          { name: 'version', type: 'int', default: '0', isNullable: false },
          { name: 'created_by_user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'updated_by_user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'updated_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'UQ_events_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IX_events_status_window',
        columnNames: ['status', 'starts_at', 'ends_at'],
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IX_events_scope_status',
        columnNames: ['scope_key', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IX_events_parish_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [events]
      ADD CONSTRAINT [CK_events_scope_type]
      CHECK ([scope_type] IN ('GLOBAL', 'PARISH', 'CLASS'))
    `);

    await queryRunner.query(`
      ALTER TABLE [events]
      ADD CONSTRAINT [CK_events_status]
      CHECK ([status] IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'ARCHIVED'))
    `);

    await queryRunner.query(`
      ALTER TABLE [events]
      ADD CONSTRAINT [CK_events_window]
      CHECK ([starts_at] < [ends_at])
    `);

    // -------------------------------------------------------------------------
    // 6. event_targets
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'event_targets',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'event_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'target_type', type: 'varchar', length: '16', isNullable: false },
          { name: 'parish_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'class_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'role_code', type: 'varchar', length: '64', isNullable: true },
          { name: 'target_key', type: 'varchar', length: '128', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'event_targets',
      new TableForeignKey({
        name: 'FK_event_targets_event_id',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'event_targets',
      new TableIndex({
        name: 'UQ_event_targets_event_target_key',
        columnNames: ['event_id', 'target_key'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'event_targets',
      new TableIndex({
        name: 'IX_event_targets_lookup',
        columnNames: ['target_type', 'parish_id', 'class_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [event_targets]
      ADD CONSTRAINT [CK_event_targets_target_type]
      CHECK ([target_type] IN ('GLOBAL', 'PARISH', 'CLASS', 'ROLE'))
    `);

    // -------------------------------------------------------------------------
    // 7. event_registrations
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'event_registrations',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'event_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'registrant_key', type: 'varchar', length: '64', isNullable: false },
          { name: 'user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'student_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'enrollment_id', type: 'uniqueidentifier', isNullable: true },
          { name: 'status', type: 'varchar', length: '16', default: "'REGISTERED'", isNullable: false },
          { name: 'registered_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'cancelled_at', type: 'datetime2', isNullable: true },
          { name: 'checked_in_at', type: 'datetime2', isNullable: true },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'updated_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'event_registrations',
      new TableForeignKey({
        name: 'FK_event_registrations_event_id',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'event_registrations',
      new TableIndex({
        name: 'UQ_event_registrations_event_registrant',
        columnNames: ['event_id', 'registrant_key'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'event_registrations',
      new TableIndex({
        name: 'IX_event_registrations_event_status',
        columnNames: ['event_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'event_registrations',
      new TableIndex({
        name: 'IX_event_registrations_user',
        columnNames: ['user_id', 'status'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [event_registrations]
      ADD CONSTRAINT [CK_event_registrations_status]
      CHECK ([status] IN ('REGISTERED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'))
    `);

    // -------------------------------------------------------------------------
    // 8. notifications
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'application_event_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'operation_key', type: 'varchar', length: '128', isNullable: false },
          { name: 'source_type', type: 'varchar', length: '32', isNullable: false },
          { name: 'source_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'notification_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'title', type: 'nvarchar', length: '200', isNullable: false },
          { name: 'snippet', type: 'nvarchar', length: '500', isNullable: false },
          { name: 'action_url', type: 'nvarchar', length: '500', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'UQ_notifications_operation_key',
        columnNames: ['operation_key'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'UQ_notifications_application_event_id',
        columnNames: ['application_event_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IX_notifications_source',
        columnNames: ['source_type', 'source_id'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [notifications]
      ADD CONSTRAINT [CK_notifications_source_type]
      CHECK ([source_type] IN ('ANNOUNCEMENT', 'EVENT', 'SYSTEM'))
    `);

    // -------------------------------------------------------------------------
    // 9. notification_recipients
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'notification_recipients',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'notification_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'recipient_user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'is_read', type: 'bit', default: '0', isNullable: false },
          { name: 'read_at', type: 'datetime2', isNullable: true },
          { name: 'is_dismissed', type: 'bit', default: '0', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'updated_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'notification_recipients',
      new TableForeignKey({
        name: 'FK_notification_recipients_notification_id',
        columnNames: ['notification_id'],
        referencedTableName: 'notifications',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'notification_recipients',
      new TableIndex({
        name: 'UQ_notification_recipients_notification_user',
        columnNames: ['notification_id', 'recipient_user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'notification_recipients',
      new TableIndex({
        name: 'IX_notification_recipients_inbox',
        columnNames: ['recipient_user_id', 'is_read', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'notification_recipients',
      new TableIndex({
        name: 'IX_notification_recipients_user_created',
        columnNames: ['recipient_user_id', 'created_at'],
      }),
    );

    // -------------------------------------------------------------------------
    // 10. notification_devices
    // -------------------------------------------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'notification_devices',
        columns: [
          { name: 'id', type: 'uniqueidentifier', isPrimary: true, isNullable: false },
          { name: 'user_id', type: 'uniqueidentifier', isNullable: false },
          { name: 'platform', type: 'varchar', length: '16', isNullable: false },
          { name: 'provider', type: 'varchar', length: '16', isNullable: false },
          { name: 'token', type: 'varchar', length: '500', isNullable: false },
          { name: 'is_active', type: 'bit', default: '1', isNullable: false },
          { name: 'app_version', type: 'varchar', length: '32', isNullable: true },
          { name: 'locale', type: 'varchar', length: '32', isNullable: true },
          { name: 'last_seen_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'created_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
          { name: 'updated_at', type: 'datetime2', default: 'GETUTCDATE()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notification_devices',
      new TableIndex({
        name: 'UQ_notification_devices_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'notification_devices',
      new TableIndex({
        name: 'IX_notification_devices_user_active',
        columnNames: ['user_id', 'is_active'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [notification_devices]
      ADD CONSTRAINT [CK_notification_devices_platform]
      CHECK ([platform] IN ('IOS', 'ANDROID', 'WEB'))
    `);

    await queryRunner.query(`
      ALTER TABLE [notification_devices]
      ADD CONSTRAINT [CK_notification_devices_provider]
      CHECK ([provider] IN ('EXPO', 'FCM', 'APNS', 'WEB_PUSH'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse creation order: 10 down to 1
    await queryRunner.dropTable('notification_devices', true, true, true);
    await queryRunner.dropTable('notification_recipients', true, true, true);
    await queryRunner.dropTable('notifications', true, true, true);
    await queryRunner.dropTable('event_registrations', true, true, true);
    await queryRunner.dropTable('event_targets', true, true, true);
    await queryRunner.dropTable('events', true, true, true);
    await queryRunner.dropTable('announcement_user_states', true, true, true);
    await queryRunner.dropTable('announcement_targets', true, true, true);
    await queryRunner.dropTable('announcements', true, true, true);
    await queryRunner.dropTable('cms_entries', true, true, true);
  }
}
