import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';
import { RewardRuleStatus, RewardScopeType } from '../../enums/gamification.enums';

@Entity('reward_rules')
@Index('UQ_reward_rules_code', ['code'], { unique: true })
@Index('IX_reward_rules_event_type_status', ['eventType', 'status'])
@Index('IX_reward_rules_parish_id', ['parishId'])
export class RewardRuleEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 128 })
  code!: string;

  @Column({ type: 'varchar', length: 64, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'varchar', length: 64, name: 'source_type' })
  sourceType!: string;

  @Column({ type: 'int' })
  points!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: RewardRuleStatus;

  @Column({ type: 'int', name: 'max_awards_per_source', default: 1 })
  maxAwardsPerSource!: number;

  @Column({ type: 'varchar', length: 16, name: 'scope_type' })
  scopeType!: RewardScopeType;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'datetime2', name: 'effective_from', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ type: 'datetime2', name: 'effective_to', nullable: true })
  effectiveTo!: Date | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
