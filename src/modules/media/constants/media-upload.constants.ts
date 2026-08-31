import { MediaCategory } from '../enums/media-category.enum';

export const PUBLIC_UPLOAD_ALLOWED_CATEGORIES: readonly MediaCategory[] = [
  MediaCategory.Image,
  MediaCategory.Document,
] as const;

export const PUBLIC_UPLOAD_DEFAULT_VISIBILITY = 'PRIVATE' as const;
