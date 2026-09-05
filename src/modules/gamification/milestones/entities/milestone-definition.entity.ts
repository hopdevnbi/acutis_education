import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';
import { MilestoneDefinitionStatus, MilestoneTriggerType } from '../../enums/gamification.enums';

@Entity('milestone_definitions')
@Index('UQ_milestone_definitions_code', ['code'], { unique: true })
@Index('IX_milestone_definitions_status_sort_order', ['status', 'sortOrder'])
export class MilestoneDefinitionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: MilestoneDefinitionStatus;

  @Column({ type: 'varchar', length: 64, name: 'trigger_type' })
  triggerType!: MilestoneTriggerType;

  @Column({ type: 'nvarchar', length: 'MAX', name: 'trigger_config_json', nullable: true })
  triggerConfigJson!: string | null;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
