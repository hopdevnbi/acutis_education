import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { CommunicationTargetType } from '../enums/event.enums';

@Entity('event_targets')
@Index('UQ_event_targets_event_target_key', ['eventId', 'targetKey'], { unique: true })
@Index('IX_event_targets_lookup', ['targetType', 'parishId', 'classId'])
export class EventTargetEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'event_id' })
  eventId!: string;

  @Column({ type: 'varchar', length: 16, name: 'target_type' })
  targetType!: CommunicationTargetType;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'class_id', nullable: true })
  classId!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'role_code', nullable: true })
  roleCode!: string | null;

  @Column({ type: 'varchar', length: 128, name: 'target_key' })
  targetKey!: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;
}
