import { MediaAssetStatus } from '../enums/media-asset-status.enum';
import { MediaCategory } from '../enums/media-category.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';
import { MediaAssetAccessDeniedError } from '../errors/media-asset.errors';
import { MediaAccessService } from './media-access.service';
import { MediaAssetService } from './media-asset.service';

describe('MediaAccessService', () => {
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const assetId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  const snapshot = {
    id: assetId,
    originalFileName: 'photo.jpg',
    mimeType: 'image/jpeg',
    mediaCategory: MediaCategory.Image,
    sizeBytes: 100,
    checksumSha256: '0123456789abcdef'.repeat(4),
    status: MediaAssetStatus.Ready,
    visibility: MediaVisibility.Private,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let mediaAssetService: jest.Mocked<Pick<MediaAssetService, 'getAssetAccessRecord'>>;
  let accessControlService: { userHasPermission: jest.Mock };
  let mediaAccessService: MediaAccessService;

  beforeEach(() => {
    mediaAssetService = {
      getAssetAccessRecord: jest.fn(),
    };
    accessControlService = {
      userHasPermission: jest.fn().mockResolvedValue(false),
    };
    mediaAccessService = new MediaAccessService(
      mediaAssetService as unknown as MediaAssetService,
      accessControlService as never,
    );
  });

  it('allows the uploader to read their own asset', async () => {
    mediaAssetService.getAssetAccessRecord.mockResolvedValue({
      snapshot,
      createdByUserId: userId,
    });

    await expect(mediaAccessService.getReadableAssetRecord(assetId, userId)).resolves.toEqual({
      snapshot,
      createdByUserId: userId,
    });
  });

  it('allows users with media.read permission', async () => {
    mediaAssetService.getAssetAccessRecord.mockResolvedValue({
      snapshot,
      createdByUserId: otherUserId,
    });
    accessControlService.userHasPermission.mockImplementation((_, permission) =>
      Promise.resolve(permission === 'media.read'),
    );

    await expect(mediaAccessService.getReadableAssetRecord(assetId, userId)).resolves.toBeDefined();
  });

  it('denies unrelated users without permissions', async () => {
    mediaAssetService.getAssetAccessRecord.mockResolvedValue({
      snapshot,
      createdByUserId: otherUserId,
    });

    await expect(mediaAccessService.getReadableAssetRecord(assetId, userId)).rejects.toBeInstanceOf(
      MediaAssetAccessDeniedError,
    );
  });
});
