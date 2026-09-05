import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';

@Entity('processed_reward_events')
@Index('UQ_processed_reward_events_event_id', ['eventId'], { unique: true })
@Index('IX_processed_reward_events_student_id_processed_at', ['studentId', 'processedAt'])
export class ProcessedRewardEventEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'event_id' })
  eventId!: string;

  @Column({ type: 'varchar', length: 64, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'uniqueidentifier', name: 'student_id' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier', name: 'source_id' })
  sourceId!: string;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'enrollment_id', nullable: true })
  enrollmentId!: string | null;

  @Column({ type: 'datetime2', name: 'occurred_at' })
  occurredAt!: Date;

  @Column({ type: 'datetime2', name: 'processed_at' })
  processedAt!: Date;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;
}
