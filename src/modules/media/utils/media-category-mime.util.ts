import { MediaCategory } from '../enums/media-category.enum';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME_TYPES = new Set(['application/pdf']);

export function resolveMaxBytesForCategory(
  category: MediaCategory,
  sizeLimits: {
    maxImageBytes: number;
    maxDocumentBytes: number;
    maxAudioBytes: number;
    maxVideoBytes: number;
  },
): number {
  switch (category) {
    case MediaCategory.Image:
      return sizeLimits.maxImageBytes;
    case MediaCategory.Document:
      return sizeLimits.maxDocumentBytes;
    case MediaCategory.Audio:
      return sizeLimits.maxAudioBytes;
    case MediaCategory.Video:
      return sizeLimits.maxVideoBytes;
    default:
      return sizeLimits.maxImageBytes;
  }
}

export function isMimeAllowedForCategory(mimeType: string, category: MediaCategory): boolean {
  const normalized = mimeType.trim().toLowerCase();

  switch (category) {
    case MediaCategory.Image:
      return IMAGE_MIME_TYPES.has(normalized);
    case MediaCategory.Document:
      return DOCUMENT_MIME_TYPES.has(normalized);
    case MediaCategory.Audio:
    case MediaCategory.Video:
      return false;
    default:
      return false;
  }
}

export function isCategoryEnabledForPublicUpload(category: MediaCategory): boolean {
  return category === MediaCategory.Image || category === MediaCategory.Document;
}
