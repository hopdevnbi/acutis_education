import type { ContentBlock, ContentDocumentV1 } from '../interfaces/learning-content.interface';
import { MediaCategory } from '../../media/enums/media-category.enum';
import {
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import type { MediaAssetService } from '../../media/services/media-asset.service';

export interface ContentMediaValidationIssue {
  readonly assetId: string;
  readonly code: 'ASSET_NOT_FOUND' | 'ASSET_NOT_READY' | 'ASSET_CATEGORY_MISMATCH';
  readonly message: string;
}

export function collectMediaAssetIds(document: ContentDocumentV1): readonly string[] {
  const assetIds = new Set<string>();

  for (const block of document.blocks) {
    if (block.type === 'image_ref' || block.type === 'video_ref') {
      assetIds.add(block.assetId);
    }
  }

  return [...assetIds];
}

export async function validateDocumentMediaReferences(
  document: ContentDocumentV1,
  mediaAssetService: Pick<MediaAssetService, 'assertAssetCategory' | 'getAssetSnapshot'>,
): Promise<void> {
  for (const block of document.blocks) {
    if (block.type === 'image_ref') {
      await mediaAssetService.assertAssetCategory(block.assetId, MediaCategory.Image);
    }

    if (block.type === 'video_ref') {
      await mediaAssetService.assertAssetCategory(block.assetId, MediaCategory.Video);
    }
  }
}

export async function collectDocumentMediaValidationIssues(
  document: ContentDocumentV1,
  mediaAssetService: Pick<MediaAssetService, 'assertAssetCategory' | 'getAssetSnapshot'>,
): Promise<ContentMediaValidationIssue[]> {
  const issues: ContentMediaValidationIssue[] = [];

  for (const block of document.blocks) {
    if (block.type !== 'image_ref' && block.type !== 'video_ref') {
      continue;
    }

    const expectedCategory = block.type === 'image_ref' ? MediaCategory.Image : MediaCategory.Video;

    try {
      await mediaAssetService.assertAssetCategory(block.assetId, expectedCategory);
    } catch (error: unknown) {
      if (error instanceof MediaAssetNotFoundError) {
        issues.push({
          assetId: block.assetId,
          code: 'ASSET_NOT_FOUND',
          message: 'Referenced media asset was not found.',
        });
        continue;
      }

      if (error instanceof MediaAssetNotReadyError) {
        issues.push({
          assetId: block.assetId,
          code: 'ASSET_NOT_READY',
          message: 'Referenced media asset is not ready.',
        });
        continue;
      }

      if (error instanceof MediaAssetCategoryMismatchError) {
        issues.push({
          assetId: block.assetId,
          code: 'ASSET_CATEGORY_MISMATCH',
          message: 'Referenced media asset category does not match the content block.',
        });
      }
    }
  }

  return issues;
}

export function blockReferencesMediaAsset(block: ContentBlock): block is ContentBlock & {
  assetId: string;
} {
  return block.type === 'image_ref' || block.type === 'video_ref';
}
