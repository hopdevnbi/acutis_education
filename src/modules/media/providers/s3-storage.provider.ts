import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import type { MediaS3Configuration } from '../config/media.config.types';
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
import { buildS3ObjectKey } from '../utils/s3-prefix.util';

export interface S3CommandSender {
  send(command: unknown): Promise<unknown>;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };

  return (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

function wrapProviderError(error: unknown, fallbackMessage: string): Error {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message.includes('AccessKeyId') || message.includes('SecretAccessKey')) {
    return new StorageWriteError('S3 operation failed due to storage configuration.');
  }

  return new StorageWriteError(message);
}

export class S3StorageProvider implements StorageProvider {
  readonly providerId = MediaStorageProvider.S3;

  private readonly client: S3CommandSender;
  private readonly configuration: MediaS3Configuration;

  constructor(configuration: MediaS3Configuration, client?: S3CommandSender) {
    this.configuration = configuration;
    this.client = client ?? new S3Client(this.buildClientConfiguration(configuration));
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    try {
      const result = await this.client.send(
        new PutObjectCommand({
          Bucket: this.configuration.bucket,
          Key: buildS3ObjectKey(this.configuration.prefix, input.storageKey),
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.contentLength,
        }),
      );

      return {
        etag:
          result && typeof result === 'object' && 'ETag' in result
            ? String(result.ETag)
            : undefined,
      };
    } catch (error: unknown) {
      throw wrapProviderError(error, 'S3 write failed.');
    }
  }

  async getObject(storageKey: string): Promise<GetObjectResult> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.configuration.bucket,
          Key: buildS3ObjectKey(this.configuration.prefix, storageKey),
        }),
      );

      if (
        result === null ||
        typeof result !== 'object' ||
        !('Body' in result) ||
        result.Body === undefined ||
        result.Body === null
      ) {
        throw new StorageObjectNotFoundError();
      }

      const response = result as {
        Body: unknown;
        ContentType?: string;
        ContentLength?: number;
      };
      const body = this.normalizeBody(response.Body);

      return {
        body,
        contentType:
          typeof response.ContentType === 'string'
            ? response.ContentType
            : 'application/octet-stream',
        contentLength: typeof response.ContentLength === 'number' ? response.ContentLength : 0,
      };
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        throw new StorageObjectNotFoundError();
      }

      throw new StorageReadError(error instanceof Error ? error.message : 'S3 read failed.');
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.configuration.bucket,
          Key: buildS3ObjectKey(this.configuration.prefix, storageKey),
        }),
      );
    } catch (error: unknown) {
      throw new StorageDeleteError(error instanceof Error ? error.message : 'S3 delete failed.');
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.configuration.bucket,
          Key: buildS3ObjectKey(this.configuration.prefix, storageKey),
        }),
      );

      return true;
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw new StorageReadError(error instanceof Error ? error.message : 'S3 head failed.');
    }
  }

  private buildClientConfiguration(configuration: MediaS3Configuration): S3ClientConfig {
    const clientConfiguration: S3ClientConfig = {
      region: configuration.region,
      forcePathStyle: configuration.forcePathStyle,
    };

    if (configuration.endpoint !== undefined) {
      clientConfiguration.endpoint = configuration.endpoint;
    }

    if (configuration.accessKeyId !== undefined && configuration.secretAccessKey !== undefined) {
      clientConfiguration.credentials = {
        accessKeyId: configuration.accessKeyId,
        secretAccessKey: configuration.secretAccessKey,
      };
    }

    return clientConfiguration;
  }

  private normalizeBody(body: unknown): Readable {
    if (body instanceof Readable) {
      return body;
    }

    if (body instanceof Uint8Array) {
      return Readable.from(Buffer.from(body));
    }

    if (typeof body === 'string') {
      return Readable.from(Buffer.from(body));
    }

    throw new StorageReadError('Unsupported S3 response body type.');
  }
}

export async function probeS3Readiness(
  configuration: MediaS3Configuration,
  client?: S3CommandSender,
): Promise<boolean> {
  const sender =
    client ??
    new S3Client({
      region: configuration.region,
      forcePathStyle: configuration.forcePathStyle,
      ...(configuration.endpoint !== undefined ? { endpoint: configuration.endpoint } : {}),
      ...(configuration.accessKeyId !== undefined && configuration.secretAccessKey !== undefined
        ? {
            credentials: {
              accessKeyId: configuration.accessKeyId,
              secretAccessKey: configuration.secretAccessKey,
            },
          }
        : {}),
    });

  try {
    await sender.send(
      new HeadObjectCommand({
        Bucket: configuration.bucket,
        Key: buildS3ObjectKey(configuration.prefix, 'assets/readiness-probe'),
      }),
    );

    return true;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return true;
    }

    return false;
  }
}
