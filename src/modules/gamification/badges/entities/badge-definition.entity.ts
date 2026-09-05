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
  BadgeAwardMode,
  BadgeDefinitionStatus,
  BadgeScopeType,
} from '../../enums/gamification.enums';

@Entity('badge_definitions')
@Index('UQ_badge_definitions_code', ['code'], { unique: true })
@Index('IX_badge_definitions_status_scope', ['status', 'scopeType'])
export class BadgeDefinitionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 64 })
  category!: string;

  @Column({ type: 'varchar', length: 16, name: 'scope_type' })
  scopeType!: BadgeScopeType;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: BadgeDefinitionStatus;

  @Column({ type: 'varchar', length: 16, name: 'award_mode' })
  awardMode!: BadgeAwardMode;

  @Column({ type: 'varchar', length: 64, name: 'rule_event_type', nullable: true })
  ruleEventType!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', name: 'rule_config_json', nullable: true })
  ruleConfigJson!: string | null;

  @Column({ type: 'int', name: 'points_bonus', nullable: true })
  pointsBonus!: number | null;

  @Column({ type: 'uniqueidentifier', name: 'icon_media_asset_id', nullable: true })
  iconMediaAssetId!: string | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
