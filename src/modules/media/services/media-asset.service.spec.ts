import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaConfigService } from '../config/media-config.service';
import { MediaAssetEntity } from '../entities/media-asset.entity';
import { MediaAssetStatus } from '../enums/media-asset-status.enum';
import { MediaCategory } from '../enums/media-category.enum';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';
import {
  InvalidMediaAssetInputError,
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../errors/media-asset.errors';
import { StorageProviderRegistry } from '../providers/storage-provider-registry.service';
import { MediaAssetService } from './media-asset.service';

describe('MediaAssetService', () => {
  const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const checksum = '0123456789abcdef'.repeat(4);

  let mediaAssetService: MediaAssetService;
  let mediaAssetRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let storageProviderRegistry: {
    getWriteProvider: jest.Mock;
    getProviderById: jest.Mock;
  };

  const pendingEntity: MediaAssetEntity = {
    id: assetId,
    storageProvider: MediaStorageProvider.Local,
    storageKey: 'assets/2026/08/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    originalFileName: 'photo.jpg',
    mimeType: 'image/jpeg',
    mediaCategory: MediaCategory.Image,
    sizeBytes: '1024',
    checksumSha256: checksum,
    status: MediaAssetStatus.Pending,
    visibility: MediaVisibility.Private,
    createdByUserId: null,
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    updatedAt: new Date('2026-08-30T00:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(async () => {
    mediaAssetRepository = {
      create: jest.fn((value: MediaAssetEntity) => value),
      save: jest.fn((value: MediaAssetEntity) => Promise.resolve(value)),
      findOne: jest.fn(),
    };

    storageProviderRegistry = {
      getWriteProvider: jest.fn(),
      getProviderById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaAssetService,
        {
          provide: getRepositoryToken(MediaAssetEntity),
          useValue: mediaAssetRepository,
        },
        {
          provide: StorageProviderRegistry,
          useValue: storageProviderRegistry,
        },
        {
          provide: MediaConfigService,
          useValue: {
            getConfiguration: () => ({
              sizeLimits: {
                maxImageBytes: 10_485_760,
                maxDocumentBytes: 26_214_400,
                maxAudioBytes: 26_214_400,
                maxVideoBytes: 104_857_600,
                globalMaxBytes: 104_857_600,
              },
            }),
          },
        },
      ],
    }).compile();

    mediaAssetService = module.get(MediaAssetService);
  });

  it('creates pending asset metadata with sanitized file name', async () => {
    const snapshot = await mediaAssetService.createPendingAssetMetadata({
      assetId,
      storageProvider: MediaStorageProvider.Local,
      storageKey: pendingEntity.storageKey,
      originalFileName: '../photo.jpg',
      mimeType: 'image/jpeg',
      mediaCategory: MediaCategory.Image,
      sizeBytes: 1024,
      checksumSha256: checksum,
      visibility: MediaVisibility.Private,
      createdByUserId: null,
    });

    expect(snapshot.status).toBe(MediaAssetStatus.Pending);
    expect(snapshot.originalFileName).toBe('photo.jpg');
    expect(mediaAssetRepository.save).toHaveBeenCalled();
  });

  it('rejects invalid pending input', async () => {
    await expect(
      mediaAssetService.createPendingAssetMetadata({
        assetId,
        storageProvider: MediaStorageProvider.Local,
        storageKey: pendingEntity.storageKey,
        originalFileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        mediaCategory: MediaCategory.Image,
        sizeBytes: 0,
        checksumSha256: checksum,
        visibility: MediaVisibility.Private,
        createdByUserId: null,
      }),
    ).rejects.toBeInstanceOf(InvalidMediaAssetInputError);
  });

  it('marks assets ready and failed', async () => {
    mediaAssetRepository.findOne.mockResolvedValue({ ...pendingEntity });

    const readySnapshot = await mediaAssetService.markAssetReady(assetId);

    expect(readySnapshot.status).toBe(MediaAssetStatus.Ready);

    mediaAssetRepository.findOne.mockResolvedValue({
      ...pendingEntity,
      status: MediaAssetStatus.Pending,
    });

    const failedSnapshot = await mediaAssetService.markAssetFailed(assetId);

    expect(failedSnapshot.status).toBe(MediaAssetStatus.Failed);
  });

  it('throws when asset is missing or deleted', async () => {
    mediaAssetRepository.findOne.mockResolvedValue(null);

    await expect(mediaAssetService.getAssetSnapshot(assetId)).rejects.toBeInstanceOf(
      MediaAssetNotFoundError,
    );

    mediaAssetRepository.findOne.mockResolvedValue({
      ...pendingEntity,
      status: MediaAssetStatus.Deleted,
    });

    await expect(mediaAssetService.getAssetSnapshot(assetId)).rejects.toBeInstanceOf(
      MediaAssetNotFoundError,
    );
  });

  it('asserts ready status and category', async () => {
    mediaAssetRepository.findOne.mockResolvedValue({
      ...pendingEntity,
      status: MediaAssetStatus.Pending,
    });

    await expect(mediaAssetService.assertAssetReady(assetId)).rejects.toBeInstanceOf(
      MediaAssetNotReadyError,
    );

    mediaAssetRepository.findOne.mockResolvedValue({
      ...pendingEntity,
      status: MediaAssetStatus.Ready,
      mediaCategory: MediaCategory.Document,
    });

    await expect(
      mediaAssetService.assertAssetCategory(assetId, MediaCategory.Image),
    ).rejects.toBeInstanceOf(MediaAssetCategoryMismatchError);

    mediaAssetRepository.findOne.mockResolvedValue({
      ...pendingEntity,
      status: MediaAssetStatus.Ready,
      mediaCategory: MediaCategory.Image,
    });

    await expect(
      mediaAssetService.assertAssetCategory(assetId, MediaCategory.Image),
    ).resolves.toMatchObject({
      id: assetId,
      mediaCategory: MediaCategory.Image,
      status: MediaAssetStatus.Ready,
    });
  });

  it('resolves storage providers through the registry', () => {
    const writeProvider = { providerId: MediaStorageProvider.Local };
    const readProvider = { providerId: MediaStorageProvider.S3 };

    storageProviderRegistry.getWriteProvider.mockReturnValue(writeProvider);
    storageProviderRegistry.getProviderById.mockReturnValue(readProvider);

    expect(mediaAssetService.getWriteStorageProvider()).toBe(writeProvider);
    expect(mediaAssetService.resolveStorageProviderForAsset(MediaStorageProvider.S3)).toBe(
      readProvider,
    );
  });
});
