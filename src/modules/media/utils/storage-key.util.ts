import { isUuidV4 } from '../../../database/uuid-v4.util';
import { UnsafeStorageKeyError } from '../providers/errors/storage-provider.errors';

const STORAGE_KEY_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function buildMediaStorageKey(assetId: string, createdAt: Date = new Date()): string {
  if (!isUuidV4(assetId)) {
    throw new UnsafeStorageKeyError('Asset id must be a UUID v4 to build a storage key.');
  }

  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');

  return `assets/${String(year)}/${month}/${assetId}`;
}

export function assertSafeStorageKey(storageKey: string): string {
  const trimmed = storageKey.trim();

  if (trimmed.length === 0) {
    throw new UnsafeStorageKeyError('Storage key must not be empty.');
  }

  if (trimmed.includes('\\') || trimmed.startsWith('/') || trimmed.includes('\0')) {
    throw new UnsafeStorageKeyError('Storage key contains unsafe path characters.');
  }

  if (trimmed.includes('..')) {
    throw new UnsafeStorageKeyError('Storage key must not contain parent directory segments.');
  }

  const segments = trimmed.split('/');

  for (const segment of segments) {
    if (segment.length === 0) {
      throw new UnsafeStorageKeyError('Storage key must not contain empty path segments.');
    }

    if (!STORAGE_KEY_SEGMENT_PATTERN.test(segment) && !isUuidV4(segment)) {
      throw new UnsafeStorageKeyError(`Storage key segment "${segment}" is not allowed.`);
    }
  }

  return trimmed;
}
