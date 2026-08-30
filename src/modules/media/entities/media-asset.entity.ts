import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { MediaAssetStatus } from '../enums/media-asset-status.enum';
import { MediaCategory } from '../enums/media-category.enum';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

@Entity('media_assets')
@Index('UQ_media_assets_storage_provider_storage_key', ['storageProvider', 'storageKey'], {
  unique: true,
})
@Index('IX_media_assets_status_created_at', ['status', 'createdAt'])
@Index('IX_media_assets_created_by_user_id', ['createdByUserId'])
export class MediaAssetEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  storageProvider!: MediaStorageProvider;

  @Column({ type: 'nvarchar', length: 512 })
  storageKey!: string;

  @Column({ type: 'nvarchar', length: 260 })
  originalFileName!: string;

  @Column({ type: 'varchar', length: 127 })
  mimeType!: string;

  @Column({ type: 'varchar', length: 32 })
  mediaCategory!: MediaCategory;

  @Column({ type: 'bigint' })
  sizeBytes!: string;

  @Column({ type: 'char', length: 64 })
  checksumSha256!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: MediaAssetStatus;

  @Column({ type: 'varchar', length: 32 })
  visibility!: MediaVisibility;

  @Column({ type: 'uniqueidentifier', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  deletedAt!: Date | null;
}
