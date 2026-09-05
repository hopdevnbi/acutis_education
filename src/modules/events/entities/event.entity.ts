import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { EventScopeType, EventStatus } from '../enums/event.enums';

@Entity('events')
@Index('UQ_events_code', ['code'], { unique: true })
@Index('IX_events_status_window', ['status', 'startsAt', 'endsAt'])
@Index('IX_events_scope_status', ['scopeKey', 'status'])
@Index('IX_events_parish_status', ['parishId', 'status'])
export class EventEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  @Column({ type: 'nvarchar', length: 'max' })
  description!: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  summary!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'vi-VN' })
  locale!: string;

  @Column({ type: 'varchar', length: 16, name: 'scope_type' })
  scopeType!: EventScopeType;

  @Column({ type: 'varchar', length: 64, name: 'scope_key' })
  scopeKey!: string;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'class_id', nullable: true })
  classId!: string | null;

  @Column({ type: 'varchar', length: 16, default: EventStatus.Draft })
  status!: EventStatus;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Ho_Chi_Minh' })
  timezone!: string;

  @Column({ type: 'datetime2', name: 'starts_at' })
  startsAt!: Date;

  @Column({ type: 'datetime2', name: 'ends_at' })
  endsAt!: Date;

  @Column({ type: 'nvarchar', length: 200, name: 'venue_name', nullable: true })
  venueName!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'cover_media_asset_id', nullable: true })
  coverMediaAssetId!: string | null;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ type: 'bit', name: 'is_registration_required', default: false })
  isRegistrationRequired!: boolean;

  @Column({ type: 'datetime2', name: 'registration_deadline', nullable: true })
  registrationDeadline!: Date | null;

  @Column({ type: 'datetime2', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'datetime2', name: 'cancelled_at', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'nvarchar', length: 500, name: 'cancellation_reason', nullable: true })
  cancellationReason!: string | null;

  @Column({ type: 'int', default: 0 })
  version!: number;

  @Column({ type: 'uniqueidentifier', name: 'created_by_user_id' })
  createdByUserId!: string;

  @Column({ type: 'uniqueidentifier', name: 'updated_by_user_id' })
  updatedByUserId!: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
