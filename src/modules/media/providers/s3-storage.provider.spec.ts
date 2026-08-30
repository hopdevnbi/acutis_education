import { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import type { MediaS3Configuration } from '../config/media.config.types';
import { StorageObjectNotFoundError, StorageReadError } from './errors/storage-provider.errors';
import { probeS3Readiness, S3StorageProvider, type S3CommandSender } from './s3-storage.provider';

describe('S3StorageProvider', () => {
  const configuration: MediaS3Configuration = {
    bucket: 'demo-bucket',
    region: 'ap-southeast-1',
    endpoint: undefined,
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    forcePathStyle: false,
    prefix: 'media/',
    publicBaseUrl: undefined,
    readinessProbeEnabled: false,
  };

  it('writes objects with prefixed keys', async () => {
    const send = jest
      .fn<Promise<{ ETag?: string }>, [unknown]>()
      .mockResolvedValue({ ETag: '"etag"' });
    const client: S3CommandSender = { send };
    const provider = new S3StorageProvider(configuration, client);

    const result = await provider.putObject({
      storageKey: 'assets/2026/08/asset-id',
      body: Buffer.from('payload'),
      contentType: 'text/plain',
      contentLength: 7,
    });

    expect(result.etag).toBe('"etag"');
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    const firstCallArgument = send.mock.calls[0]?.[0];

    expect(firstCallArgument).toBeInstanceOf(PutObjectCommand);

    const command = firstCallArgument as PutObjectCommand;

    expect(command.input.Key).toBe('media/assets/2026/08/asset-id');
    expect(command.input.Bucket).toBe('demo-bucket');
  });

  it('reads object bodies from S3 responses', async () => {
    const send = jest.fn().mockResolvedValue({
      Body: Readable.from(Buffer.from('s3 payload')),
      ContentType: 'text/plain',
      ContentLength: 10,
    });
    const provider = new S3StorageProvider(configuration, { send });

    const result = await provider.getObject('assets/2026/08/asset-id');
    const chunks: Buffer[] = [];

    for await (const chunk of result.body) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
    }

    expect(Buffer.concat(chunks).toString('utf8')).toBe('s3 payload');
    expect(send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
  });

  it('maps missing objects to StorageObjectNotFoundError', async () => {
    const send = jest
      .fn()
      .mockRejectedValue({ name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
    const provider = new S3StorageProvider(configuration, { send });

    await expect(provider.getObject('assets/missing')).rejects.toBeInstanceOf(
      StorageObjectNotFoundError,
    );
  });

  it('returns false from exists when object is missing', async () => {
    const send = jest
      .fn()
      .mockRejectedValue({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });
    const provider = new S3StorageProvider(configuration, { send });

    await expect(provider.exists('assets/missing')).resolves.toBe(false);
  });

  it('deletes objects using prefixed keys', async () => {
    const send = jest.fn().mockResolvedValue({});
    const provider = new S3StorageProvider(configuration, { send });

    await provider.deleteObject('assets/2026/08/asset-id');

    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it('wraps unexpected read failures as StorageReadError', async () => {
    const send = jest.fn().mockRejectedValue(new Error('network down'));
    const provider = new S3StorageProvider(configuration, { send });

    await expect(provider.exists('assets/unreachable')).rejects.toBeInstanceOf(StorageReadError);
  });

  it('exposes S3 provider id', () => {
    const provider = new S3StorageProvider(configuration, { send: jest.fn() });

    expect(provider.providerId).toBe(MediaStorageProvider.S3);
  });
});

describe('probeS3Readiness', () => {
  const configuration: MediaS3Configuration = {
    bucket: 'demo-bucket',
    region: 'ap-southeast-1',
    endpoint: undefined,
    accessKeyId: undefined,
    secretAccessKey: undefined,
    forcePathStyle: false,
    prefix: 'media/',
    publicBaseUrl: undefined,
    readinessProbeEnabled: true,
  };

  it('returns true when head request succeeds', async () => {
    const send = jest.fn().mockResolvedValue({});

    await expect(probeS3Readiness(configuration, { send })).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
  });

  it('returns true when probe object is missing but bucket is reachable', async () => {
    const send = jest
      .fn()
      .mockRejectedValue({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });

    await expect(probeS3Readiness(configuration, { send })).resolves.toBe(true);
  });

  it('returns false when bucket is unreachable', async () => {
    const send = jest.fn().mockRejectedValue(new Error('access denied'));

    await expect(probeS3Readiness(configuration, { send })).resolves.toBe(false);
  });
});
