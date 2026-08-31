import { MediaCategory } from '../enums/media-category.enum';
import { DEFAULT_MEDIA_MAX_DOCUMENT_BYTES } from '../config/media.config.types';

export const PUBLIC_UPLOAD_ALLOWED_CATEGORIES: readonly MediaCategory[] = [
  MediaCategory.Image,
  MediaCategory.Document,
] as const;

export const PUBLIC_UPLOAD_DEFAULT_VISIBILITY = 'PRIVATE' as const;

/** Hard cap for multipart memory buffering — max enabled category (DOCUMENT) plus small margin. */
export const MULTIPART_UPLOAD_MAX_BYTES = DEFAULT_MEDIA_MAX_DOCUMENT_BYTES + 65_536;

export const MEDIA_UPLOAD_THROTTLE_LIMIT = 30;
export const MEDIA_UPLOAD_THROTTLE_TTL_MS = 60_000;
