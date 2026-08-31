import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { MediaCategory } from '../../media/enums/media-category.enum';
import {
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import type { MediaAssetService } from '../../media/services/media-asset.service';
import type { QuestionPublishValidationIssue } from '../errors/question-bank.errors';
import { InvalidQuestionMediaJsonError } from '../errors/question-bank.errors';

export const QUESTION_MEDIA_JSON_SCHEMA_VERSION = 1 as const;

export interface QuestionMediaReferenceItem {
  readonly type: 'image_ref';
  readonly assetId: string;
  readonly alt?: string;
}

export interface QuestionMediaJsonDocument {
  readonly schemaVersion: typeof QUESTION_MEDIA_JSON_SCHEMA_VERSION;
  readonly items: readonly QuestionMediaReferenceItem[];
}

export interface QuestionMediaValidationIssue {
  readonly code: 'ASSET_NOT_FOUND' | 'ASSET_NOT_READY' | 'ASSET_CATEGORY_MISMATCH';
  readonly message: string;
  readonly resourceId: string;
  readonly path: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMediaReferenceItem(value: unknown): QuestionMediaReferenceItem {
  if (!isRecord(value)) {
    throw new InvalidQuestionMediaJsonError();
  }

  if (value['type'] !== 'image_ref') {
    throw new InvalidQuestionMediaJsonError();
  }

  const assetId = value['assetId'];

  if (typeof assetId !== 'string' || !isUuidV4(assetId)) {
    throw new InvalidQuestionMediaJsonError();
  }

  const alt = value['alt'];

  if (alt !== undefined && (typeof alt !== 'string' || alt.trim().length === 0)) {
    throw new InvalidQuestionMediaJsonError();
  }

  return {
    type: 'image_ref',
    assetId: normalizeUuid(assetId),
    alt: alt === undefined ? undefined : alt.trim(),
  };
}

export function parseQuestionMediaJsonDocument(rawMediaJson: string): QuestionMediaJsonDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawMediaJson) as unknown;
  } catch {
    throw new InvalidQuestionMediaJsonError();
  }

  if (!isRecord(parsed)) {
    throw new InvalidQuestionMediaJsonError();
  }

  if (parsed['schemaVersion'] !== QUESTION_MEDIA_JSON_SCHEMA_VERSION) {
    throw new InvalidQuestionMediaJsonError();
  }

  const itemsValue = parsed['items'];

  if (!Array.isArray(itemsValue)) {
    throw new InvalidQuestionMediaJsonError();
  }

  const items = itemsValue.map((item) => parseMediaReferenceItem(item));

  return {
    schemaVersion: QUESTION_MEDIA_JSON_SCHEMA_VERSION,
    items,
  };
}

export function parseOptionalQuestionMediaJson(
  rawMediaJson: string | null | undefined,
): string | null {
  if (rawMediaJson === undefined || rawMediaJson === null) {
    return null;
  }

  const trimmed = rawMediaJson.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const document = parseQuestionMediaJsonDocument(trimmed);

  return JSON.stringify(document);
}

export async function validateQuestionMediaJsonAssets(
  rawMediaJson: string | null,
  mediaAssetService: Pick<MediaAssetService, 'assertAssetCategory'>,
): Promise<void> {
  if (rawMediaJson === null || rawMediaJson.trim().length === 0) {
    return;
  }

  const document = parseQuestionMediaJsonDocument(rawMediaJson);

  for (const item of document.items) {
    await mediaAssetService.assertAssetCategory(item.assetId, MediaCategory.Image);
  }
}

export async function collectQuestionMediaJsonValidationIssues(
  rawMediaJson: string | null,
  mediaAssetService: Pick<MediaAssetService, 'assertAssetCategory'>,
  pathPrefix: string,
): Promise<QuestionMediaValidationIssue[]> {
  if (rawMediaJson === null || rawMediaJson.trim().length === 0) {
    return [];
  }

  let document: QuestionMediaJsonDocument;

  try {
    document = parseQuestionMediaJsonDocument(rawMediaJson);
  } catch {
    return [
      {
        code: 'ASSET_NOT_FOUND',
        message: 'Question media JSON is invalid.',
        resourceId: pathPrefix,
        path: pathPrefix,
      },
    ];
  }

  const issues: QuestionMediaValidationIssue[] = [];

  for (const [index, item] of document.items.entries()) {
    const itemPath = `${pathPrefix}/items/${index}`;

    try {
      await mediaAssetService.assertAssetCategory(item.assetId, MediaCategory.Image);
    } catch (error: unknown) {
      if (error instanceof MediaAssetNotFoundError) {
        issues.push({
          code: 'ASSET_NOT_FOUND',
          message: 'Referenced media asset was not found.',
          resourceId: item.assetId,
          path: itemPath,
        });
        continue;
      }

      if (error instanceof MediaAssetNotReadyError) {
        issues.push({
          code: 'ASSET_NOT_READY',
          message: 'Referenced media asset is not ready.',
          resourceId: item.assetId,
          path: itemPath,
        });
        continue;
      }

      if (error instanceof MediaAssetCategoryMismatchError) {
        issues.push({
          code: 'ASSET_CATEGORY_MISMATCH',
          message: 'Referenced media asset category does not match the expected image type.',
          resourceId: item.assetId,
          path: itemPath,
        });
      }
    }
  }

  return issues;
}

export function toPublishValidationIssues(
  mediaIssues: readonly QuestionMediaValidationIssue[],
): QuestionPublishValidationIssue[] {
  return mediaIssues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    resourceId: issue.resourceId,
    path: issue.path,
  }));
}

export function learnerProjectionReferencesMediaAsset(
  projection: {
    readonly promptMediaJson: string | null;
    readonly options: readonly { readonly mediaAssetId: string | null }[];
  },
  rawAssetId: string,
): boolean {
  const normalizedAssetId = normalizeUuid(rawAssetId);

  if (projection.promptMediaJson !== null && projection.promptMediaJson.trim().length > 0) {
    try {
      const document = parseQuestionMediaJsonDocument(projection.promptMediaJson);

      if (document.items.some((item) => normalizeUuid(item.assetId) === normalizedAssetId)) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return projection.options.some(
    (option) =>
      option.mediaAssetId !== null && normalizeUuid(option.mediaAssetId) === normalizedAssetId,
  );
}
