import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { CmsEntryStatus, CmsEntryType, CmsScopeType } from '../enums/cms.enums';

@Entity('cms_entries')
@Index('UQ_cms_entries_scope_slug', ['scopeKey', 'slug'], { unique: true })
@Index('IX_cms_entries_status_published', ['status', 'publishedAt'])
@Index('IX_cms_entries_scope_key_status', ['scopeKey', 'status'])
export class CmsEntryEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 32 })
  type!: CmsEntryType;

  @Column({ type: 'varchar', length: 16, name: 'scope_type' })
  scopeType!: CmsScopeType;

  @Column({ type: 'varchar', length: 64, name: 'scope_key' })
  scopeKey!: string;

  @Column({ type: 'uniqueidentifier', name: 'parish_id', nullable: true })
  parishId!: string | null;

  @Column({ type: 'varchar', length: 128 })
  slug!: string;

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  summary!: string | null;

  @Column({ type: 'nvarchar', length: 'max' })
  body!: string;

  @Column({ type: 'varchar', length: 32, default: 'vi-VN' })
  locale!: string;

  @Column({ type: 'varchar', length: 16, default: CmsEntryStatus.Draft })
  status!: CmsEntryStatus;

  @Column({ type: 'uniqueidentifier', name: 'cover_media_asset_id', nullable: true })
  coverMediaAssetId!: string | null;

  @Column({ type: 'bit', name: 'is_featured', default: false })
  isFeatured!: boolean;

  @Column({ type: 'datetime2', name: 'scheduled_for', nullable: true })
  scheduledFor!: Date | null;

  @Column({ type: 'datetime2', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'datetime2', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'uniqueidentifier', name: 'created_by_user_id' })
  createdByUserId!: string;

  @Column({ type: 'uniqueidentifier', name: 'updated_by_user_id' })
  updatedByUserId!: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
