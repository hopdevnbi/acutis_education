import type { MediaAssetStatus } from '../enums/media-asset-status.enum';
import type { MediaCategory } from '../enums/media-category.enum';
import type { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import type { MediaVisibility } from '../enums/media-visibility.enum';

export interface MediaAssetSnapshot {
  readonly id: string;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly mediaCategory: MediaCategory;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly status: MediaAssetStatus;
  readonly visibility: MediaVisibility;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePendingMediaAssetInput {
  readonly assetId: string;
  readonly storageProvider: MediaStorageProvider;
  readonly storageKey: string;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly mediaCategory: MediaCategory;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly visibility: MediaVisibility;
  readonly createdByUserId: string | null;
}

export interface MediaAssetStorageRecord {
  readonly id: string;
  readonly storageProvider: MediaStorageProvider;
  readonly storageKey: string;
  readonly status: MediaAssetStatus;
}
