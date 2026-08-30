import type { MediaAssetEntity } from '../entities/media-asset.entity';
import type {
  MediaAssetSnapshot,
  MediaAssetStorageRecord,
} from '../interfaces/media-asset.interface';

export function toMediaAssetSnapshot(entity: MediaAssetEntity): MediaAssetSnapshot {
  return {
    id: entity.id,
    originalFileName: entity.originalFileName,
    mimeType: entity.mimeType,
    mediaCategory: entity.mediaCategory,
    sizeBytes: Number(entity.sizeBytes),
    checksumSha256: entity.checksumSha256,
    status: entity.status,
    visibility: entity.visibility,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toMediaAssetStorageRecord(entity: MediaAssetEntity): MediaAssetStorageRecord {
  return {
    id: entity.id,
    storageProvider: entity.storageProvider,
    storageKey: entity.storageKey,
    status: entity.status,
  };
}
