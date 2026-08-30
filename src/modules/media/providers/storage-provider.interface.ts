import type { Readable } from 'node:stream';
import type { MediaStorageProvider } from '../enums/media-storage-provider.enum';

export interface PutObjectInput {
  readonly storageKey: string;
  readonly body: Buffer | Readable;
  readonly contentType: string;
  readonly contentLength: number;
}

export interface PutObjectResult {
  readonly etag?: string;
}

export interface GetObjectResult {
  readonly body: Readable;
  readonly contentType: string;
  readonly contentLength: number;
}

export interface StorageProvider {
  readonly providerId: MediaStorageProvider;
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getObject(storageKey: string): Promise<GetObjectResult>;
  deleteObject(storageKey: string): Promise<void>;
  exists?(storageKey: string): Promise<boolean>;
}
