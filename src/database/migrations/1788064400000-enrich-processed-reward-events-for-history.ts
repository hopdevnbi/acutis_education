import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enrich processed_reward_events for Gamification-owned count queries
 * (badges/milestones). Non-PII fields only.
 */
export class EnrichProcessedRewardEventsForHistory1788064400000 implements MigrationInterface {
  name = 'EnrichProcessedRewardEventsForHistory1788064400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [processed_reward_events]
      ADD [parish_id] uniqueidentifier NULL
    `);
    await queryRunner.query(`
      ALTER TABLE [processed_reward_events]
      ADD [enrollment_id] uniqueidentifier NULL
    `);
    await queryRunner.query(`
      ALTER TABLE [processed_reward_events]
      ADD [occurred_at] datetime2 NULL
    `);

    await queryRunner.query(`
      UPDATE [processed_reward_events]
      SET [occurred_at] = [processed_at]
      WHERE [occurred_at] IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [processed_reward_events]
      ALTER COLUMN [occurred_at] datetime2 NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX [IX_processed_reward_events_student_id_event_type_occurred_at]
      ON [processed_reward_events] ([student_id], [event_type], [occurred_at])
    `);

    await queryRunner.query(`
      CREATE INDEX [IX_processed_reward_events_parish_id]
      ON [processed_reward_events] ([parish_id])
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX [IX_processed_reward_events_parish_id] ON [processed_reward_events]
    `);
    await queryRunner.query(`
      DROP INDEX [IX_processed_reward_events_student_id_event_type_occurred_at]
      ON [processed_reward_events]
    `);
    await queryRunner.query(`
      ALTER TABLE [processed_reward_events] DROP COLUMN [occurred_at]
    `);
    await queryRunner.query(`
      ALTER TABLE [processed_reward_events] DROP COLUMN [enrollment_id]
    `);
    await queryRunner.query(`
      ALTER TABLE [processed_reward_events] DROP COLUMN [parish_id]
    `);
  }
}
