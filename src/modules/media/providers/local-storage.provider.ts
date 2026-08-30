import { createReadStream, existsSync, statSync } from 'node:fs';
import { rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import {
  StorageDeleteError,
  StorageObjectNotFoundError,
  StorageReadError,
  StorageWriteError,
} from './errors/storage-provider.errors';
import type {
  GetObjectResult,
  PutObjectInput,
  PutObjectResult,
  StorageProvider,
} from './storage-provider.interface';
import {
  assertResolvedPathInsideRoot,
  ensureParentDirectoryExists,
  ensureStorageRootExists,
  resolveAbsoluteStorageRoot,
  resolveLocalObjectPath,
} from '../utils/local-path.util';

export class LocalStorageProvider implements StorageProvider {
  readonly providerId = MediaStorageProvider.Local;

  private readonly root: string;
  private initialized = false;

  constructor(rawRoot: string) {
    this.root = resolveAbsoluteStorageRoot(rawRoot);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await ensureStorageRootExists(this.root);
    this.initialized = true;
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    await this.initialize();

    const objectPath = resolveLocalObjectPath(this.root, input.storageKey);
    await ensureParentDirectoryExists(objectPath);

    const tempPath = `${objectPath}.${randomUUID()}.tmp`;

    try {
      if (Buffer.isBuffer(input.body)) {
        await writeFile(tempPath, input.body);
      } else {
        const chunks: Buffer[] = [];

        for await (const chunk of input.body) {
          if (Buffer.isBuffer(chunk)) {
            chunks.push(chunk);
          } else if (typeof chunk === 'string') {
            chunks.push(Buffer.from(chunk));
          } else {
            chunks.push(Buffer.from(chunk as Uint8Array));
          }
        }

        await writeFile(tempPath, Buffer.concat(chunks));
      }

      await rename(tempPath, objectPath);

      return {};
    } catch (error: unknown) {
      await this.safeUnlink(tempPath);

      const message =
        error instanceof Error ? error.message : 'Unknown local storage write failure.';

      throw new StorageWriteError(message);
    }
  }

  async getObject(storageKey: string): Promise<GetObjectResult> {
    await this.initialize();

    const objectPath = resolveLocalObjectPath(this.root, storageKey);

    if (!existsSync(objectPath)) {
      throw new StorageObjectNotFoundError();
    }

    try {
      const resolvedPath = await assertResolvedPathInsideRoot(this.root, objectPath);
      const stats = statSync(resolvedPath);

      return {
        body: createReadStream(resolvedPath),
        contentType: 'application/octet-stream',
        contentLength: stats.size,
      };
    } catch (error: unknown) {
      if (error instanceof StorageObjectNotFoundError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown local storage read failure.';

      throw new StorageReadError(message);
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.initialize();

    const objectPath = resolveLocalObjectPath(this.root, storageKey);

    if (!existsSync(objectPath)) {
      throw new StorageObjectNotFoundError();
    }

    try {
      const resolvedPath = await assertResolvedPathInsideRoot(this.root, objectPath);
      await unlink(resolvedPath);
    } catch (error: unknown) {
      if (error instanceof StorageObjectNotFoundError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown local storage delete failure.';

      throw new StorageDeleteError(message);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    await this.initialize();

    const objectPath = resolveLocalObjectPath(this.root, storageKey);

    return existsSync(objectPath);
  }

  private async safeUnlink(path: string): Promise<void> {
    if (!existsSync(path)) {
      return;
    }

    try {
      await unlink(path);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

export function bufferToReadable(buffer: Buffer): Readable {
  return Readable.from(buffer);
}
