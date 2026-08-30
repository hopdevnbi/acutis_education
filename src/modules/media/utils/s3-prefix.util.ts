import { UnsafeStorageKeyError } from '../providers/errors/storage-provider.errors';

export function normalizeS3Prefix(rawPrefix: string | undefined): string {
  if (rawPrefix === undefined || rawPrefix.trim().length === 0) {
    return '';
  }

  const trimmed = rawPrefix.trim().replace(/\\/g, '/');

  if (trimmed.includes('\0') || trimmed.includes('..')) {
    throw new UnsafeStorageKeyError('S3 prefix contains unsafe characters.');
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  const normalized = withoutLeadingSlash.replace(/\/{2,}/g, '/');

  if (normalized.length === 0) {
    return '';
  }

  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

export function buildS3ObjectKey(prefix: string, storageKey: string): string {
  const normalizedPrefix = normalizeS3Prefix(prefix);

  return `${normalizedPrefix}${storageKey}`;
}
