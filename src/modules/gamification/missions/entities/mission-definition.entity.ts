import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';
import {
  MissionConditionType,
  MissionDefinitionStatus,
  MissionScopeType,
} from '../../enums/gamification.enums';

@Entity('mission_definitions')
@Index('UQ_mission_definitions_scope_key_code', ['scopeKey', 'code'], { unique: true })
@Index('IX_mission_definitions_status_scope', ['status', 'scopeType'])
@Index('IX_mission_definitions_class_id', ['classId'])
export class MissionDefinitionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: MissionDefinitionStatus;

  @Column({ type: 'varchar', length: 16, name: 'scope_type' })
  scopeType!: MissionScopeType;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'class_id', nullable: true })
  classId!: string | null;

  /** Derived uniqueness key: GLOBAL | PARISH:{id} | CLASS:{id} */
  @Column({ type: 'varchar', length: 80, name: 'scope_key' })
  scopeKey!: string;

  @Column({ type: 'varchar', length: 64, name: 'condition_type' })
  conditionType!: MissionConditionType;

  @Column({ type: 'int', name: 'target_count' })
  targetCount!: number;

  @Column({ type: 'int', name: 'points_bonus', nullable: true })
  pointsBonus!: number | null;

  @Column({ type: 'datetime2', name: 'starts_at', nullable: true })
  startsAt!: Date | null;

  @Column({ type: 'datetime2', name: 'ends_at', nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
