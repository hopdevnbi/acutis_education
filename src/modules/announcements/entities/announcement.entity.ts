import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
} from '../enums/announcement.enums';

@Entity('announcements')
@Index('IX_announcements_status_window', ['status', 'startsAt', 'endsAt'])
@Index('IX_announcements_parish_status', ['parishId', 'status'])
export class AnnouncementEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  @Column({ type: 'nvarchar', length: 'max' })
  body!: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  summary!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'vi-VN' })
  locale!: string;

  @Column({ type: 'varchar', length: 16, default: AnnouncementPriority.Normal })
  priority!: AnnouncementPriority;

  @Column({ type: 'varchar', length: 16, default: AnnouncementStatus.Draft })
  status!: AnnouncementStatus;

  @Column({ type: 'varchar', length: 16, name: 'scope_type' })
  scopeType!: AnnouncementScopeType;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'datetime2', name: 'starts_at' })
  startsAt!: Date;

  @Column({ type: 'datetime2', name: 'ends_at', nullable: true })
  endsAt!: Date | null;

  @Column({ type: 'bit', name: 'is_pinned', default: false })
  isPinned!: boolean;

  @Column({ type: 'uniqueidentifier', name: 'cover_media_asset_id', nullable: true })
  coverMediaAssetId!: string | null;

  @Column({ type: 'datetime2', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'uniqueidentifier', name: 'created_by_user_id' })
  createdByUserId!: string;

  @Column({ type: 'uniqueidentifier', name: 'updated_by_user_id' })
  updatedByUserId!: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
