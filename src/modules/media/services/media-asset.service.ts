import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { MediaConfigService } from '../config/media-config.service';
import { MediaAssetEntity } from '../entities/media-asset.entity';
import { MediaAssetStatus } from '../enums/media-asset-status.enum';
import { MediaCategory } from '../enums/media-category.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';
import {
  InvalidMediaAssetInputError,
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
  MediaStorageUnavailableError,
  MediaUploadCategoryNotAllowedError,
  MediaUploadTooLargeError,
  UnsupportedMediaTypeError,
} from '../errors/media-asset.errors';
import type {
  CreateMediaUploadInput,
  CreatePendingMediaAssetInput,
  MediaAssetAccessRecord,
  MediaAssetContent,
  MediaAssetSnapshot,
  MediaAssetStorageRecord,
} from '../interfaces/media-asset.interface';
import { toMediaAssetSnapshot, toMediaAssetStorageRecord } from '../mappers/media-asset.mapper';
import { StorageProviderRegistry } from '../providers/storage-provider-registry.service';
import type { StorageProvider } from '../providers/storage-provider.interface';
import { assertValidSha256Hex, computeSha256Hex } from '../utils/checksum.util';
import {
  isCategoryEnabledForPublicUpload,
  isMimeAllowedForCategory,
  resolveMaxBytesForCategory,
} from '../utils/media-category-mime.util';
import { detectMimeSignatureFromBuffer, isBlockedMimeType } from '../utils/mime-signature.util';
import { sanitizeOriginalFileName } from '../utils/original-filename.util';
import { buildMediaStorageKey } from '../utils/storage-key.util';

@Injectable()
export class MediaAssetService {
  constructor(
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetRepository: Repository<MediaAssetEntity>,
    private readonly storageProviderRegistry: StorageProviderRegistry,
    private readonly mediaConfigService: MediaConfigService,
  ) {}

  async createFromUpload(input: CreateMediaUploadInput): Promise<MediaAssetSnapshot> {
    if (!isCategoryEnabledForPublicUpload(input.intendedCategory)) {
      throw new MediaUploadCategoryNotAllowedError();
    }

    if (input.visibility !== MediaVisibility.Private) {
      throw new InvalidMediaAssetInputError('Only PRIVATE visibility is allowed for uploads.');
    }

    if (input.fileBuffer.length === 0) {
      throw new InvalidMediaAssetInputError('Upload file must not be empty.');
    }

    const sizeLimits = this.mediaConfigService.getConfiguration().sizeLimits;
    const maxBytes = resolveMaxBytesForCategory(input.intendedCategory, sizeLimits);

    if (input.fileBuffer.length > maxBytes) {
      throw new MediaUploadTooLargeError();
    }

    const detectedSignature = detectMimeSignatureFromBuffer(input.fileBuffer);

    if (detectedSignature === null || isBlockedMimeType(detectedSignature.mimeType)) {
      throw new UnsupportedMediaTypeError('Uploaded file type is not supported.');
    }

    if (
      detectedSignature.mediaCategory !== input.intendedCategory ||
      !isMimeAllowedForCategory(detectedSignature.mimeType, input.intendedCategory)
    ) {
      throw new UnsupportedMediaTypeError(
        'Uploaded file content does not match the declared media category.',
      );
    }

    const assetId = generateUuidV4();
    const createdAt = new Date();
    const storageKey = buildMediaStorageKey(assetId, createdAt);
    const checksumSha256 = computeSha256Hex(input.fileBuffer);
    const writeProvider = this.getWriteStorageProvider();

    await this.createPendingAssetMetadata({
      assetId,
      storageProvider: writeProvider.providerId,
      storageKey,
      originalFileName: input.originalFileName,
      mimeType: detectedSignature.mimeType,
      mediaCategory: input.intendedCategory,
      sizeBytes: input.fileBuffer.length,
      checksumSha256,
      visibility: input.visibility,
      createdByUserId: input.createdByUserId,
    });

    try {
      await writeProvider.putObject({
        storageKey,
        body: input.fileBuffer,
        contentType: detectedSignature.mimeType,
        contentLength: input.fileBuffer.length,
      });
    } catch {
      await this.markAssetFailed(assetId);
      throw new MediaStorageUnavailableError();
    }

    return this.markAssetReady(assetId);
  }

  async createPendingAssetMetadata(
    input: CreatePendingMediaAssetInput,
  ): Promise<MediaAssetSnapshot> {
    this.validatePendingInput(input);

    const entity = this.mediaAssetRepository.create({
      id: normalizeUuid(input.assetId),
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      originalFileName: sanitizeOriginalFileName(input.originalFileName),
      mimeType: input.mimeType.trim(),
      mediaCategory: input.mediaCategory,
      sizeBytes: String(input.sizeBytes),
      checksumSha256: assertValidSha256Hex(input.checksumSha256),
      status: MediaAssetStatus.Pending,
      visibility: input.visibility,
      createdByUserId: input.createdByUserId === null ? null : normalizeUuid(input.createdByUserId),
      deletedAt: null,
    });

    const savedEntity = await this.mediaAssetRepository.save(entity);

    return toMediaAssetSnapshot(savedEntity);
  }

  async markAssetReady(assetId: string): Promise<MediaAssetSnapshot> {
    const entity = await this.findEntityOrThrow(assetId);
    entity.status = MediaAssetStatus.Ready;
    entity.deletedAt = null;

    const savedEntity = await this.mediaAssetRepository.save(entity);

    return toMediaAssetSnapshot(savedEntity);
  }

  async markAssetFailed(assetId: string): Promise<MediaAssetSnapshot> {
    const entity = await this.findEntityOrThrow(assetId);
    entity.status = MediaAssetStatus.Failed;

    const savedEntity = await this.mediaAssetRepository.save(entity);

    return toMediaAssetSnapshot(savedEntity);
  }

  async getAssetSnapshot(assetId: string): Promise<MediaAssetSnapshot> {
    const entity = await this.findEntityOrThrow(assetId);

    return toMediaAssetSnapshot(entity);
  }

  async getAssetAccessRecord(assetId: string): Promise<MediaAssetAccessRecord> {
    const entity = await this.findEntityOrThrow(assetId);

    return {
      snapshot: toMediaAssetSnapshot(entity),
      createdByUserId: entity.createdByUserId,
    };
  }

  async getAssetStorageRecord(assetId: string): Promise<MediaAssetStorageRecord> {
    const entity = await this.findEntityOrThrow(assetId);

    return toMediaAssetStorageRecord(entity);
  }

  async openAssetContent(assetId: string): Promise<MediaAssetContent> {
    const snapshot = await this.assertAssetReady(assetId);
    const storageRecord = await this.getAssetStorageRecord(assetId);
    const provider = this.resolveStorageProviderForAsset(storageRecord.storageProvider);
    const objectResult = await provider.getObject(storageRecord.storageKey);

    return {
      snapshot,
      body: objectResult.body,
      contentLength: objectResult.contentLength,
    };
  }

  async assertAssetReady(assetId: string): Promise<MediaAssetSnapshot> {
    const snapshot = await this.getAssetSnapshot(assetId);

    if (snapshot.status !== MediaAssetStatus.Ready) {
      throw new MediaAssetNotReadyError();
    }

    return snapshot;
  }

  async assertAssetCategory(assetId: string, category: MediaCategory): Promise<MediaAssetSnapshot> {
    const snapshot = await this.assertAssetReady(assetId);

    if (snapshot.mediaCategory !== category) {
      throw new MediaAssetCategoryMismatchError(category, snapshot.mediaCategory);
    }

    return snapshot;
  }

  resolveStorageProviderForAsset(
    storageProvider: MediaAssetEntity['storageProvider'],
  ): StorageProvider {
    return this.storageProviderRegistry.getProviderById(storageProvider);
  }

  getWriteStorageProvider(): StorageProvider {
    return this.storageProviderRegistry.getWriteProvider();
  }

  private validatePendingInput(input: CreatePendingMediaAssetInput): void {
    if (input.sizeBytes <= 0) {
      throw new InvalidMediaAssetInputError('Media asset sizeBytes must be greater than zero.');
    }

    if (input.mimeType.trim().length === 0) {
      throw new InvalidMediaAssetInputError('Media asset mimeType must not be empty.');
    }

    if (input.storageKey.trim().length === 0) {
      throw new InvalidMediaAssetInputError('Media asset storageKey must not be empty.');
    }

    if (!Object.values(MediaVisibility).includes(input.visibility)) {
      throw new InvalidMediaAssetInputError('Media asset visibility is invalid.');
    }
  }

  private async findEntityOrThrow(assetId: string): Promise<MediaAssetEntity> {
    const entity = await this.mediaAssetRepository.findOne({
      where: { id: normalizeUuid(assetId) },
    });

    if (entity === null || entity.status === MediaAssetStatus.Deleted) {
      throw new MediaAssetNotFoundError();
    }

    return entity;
  }
}
