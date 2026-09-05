import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds typed condition_config_json for EXAM_SCORE_THRESHOLD rules
 * and filtered unique index ensuring one REVERSAL per original ledger entry.
 */
export class AddRewardRuleConditionConfigAndReversalUniqueness1788064300000
  implements MigrationInterface
{
  name = 'AddRewardRuleConditionConfigAndReversalUniqueness1788064300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD [condition_config_json] nvarchar(max) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      ADD CONSTRAINT [CK_reward_rules_condition_config_json]
      CHECK ([condition_config_json] IS NULL OR ISJSON([condition_config_json]) = 1)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_point_ledger_entries_reversal_related]
      ON [point_ledger_entries] ([related_ledger_entry_id])
      WHERE [source_type] = 'REVERSAL' AND [related_ledger_entry_id] IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX [UQ_point_ledger_entries_reversal_related] ON [point_ledger_entries]
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      DROP CONSTRAINT [CK_reward_rules_condition_config_json]
    `);

    await queryRunner.query(`
      ALTER TABLE [reward_rules]
      DROP COLUMN [condition_config_json]
    `);
  }
}
