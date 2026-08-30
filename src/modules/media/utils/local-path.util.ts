import { mkdir, realpath } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { UnsafeStorageKeyError } from '../providers/errors/storage-provider.errors';
import { assertSafeStorageKey } from './storage-key.util';

export function resolveAbsoluteStorageRoot(rawRoot: string): string {
  const trimmed = rawRoot.trim();

  if (trimmed.length === 0) {
    throw new UnsafeStorageKeyError('Local storage root must not be empty.');
  }

  return resolve(trimmed);
}

export async function ensureStorageRootExists(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
}

export function resolveLocalObjectPath(root: string, storageKey: string): string {
  const safeKey = assertSafeStorageKey(storageKey);
  const absoluteRoot = resolveAbsoluteStorageRoot(root);
  const candidatePath = resolve(absoluteRoot, ...safeKey.split('/'));
  const rootWithSeparator = absoluteRoot.endsWith(sep) ? absoluteRoot : `${absoluteRoot}${sep}`;

  if (!candidatePath.startsWith(rootWithSeparator) && candidatePath !== absoluteRoot) {
    throw new UnsafeStorageKeyError('Resolved storage path escapes the configured root.');
  }

  return candidatePath;
}

export async function assertResolvedPathInsideRoot(
  root: string,
  objectPath: string,
): Promise<string> {
  const absoluteRoot = resolveAbsoluteStorageRoot(root);
  const resolvedPath = await realpath(objectPath);
  const rootWithSeparator = absoluteRoot.endsWith(sep) ? absoluteRoot : `${absoluteRoot}${sep}`;

  if (!resolvedPath.startsWith(rootWithSeparator) && resolvedPath !== absoluteRoot) {
    throw new UnsafeStorageKeyError('Resolved storage object escapes the configured root.');
  }

  return resolvedPath;
}

export async function ensureParentDirectoryExists(objectPath: string): Promise<void> {
  await mkdir(dirname(objectPath), { recursive: true });
}
