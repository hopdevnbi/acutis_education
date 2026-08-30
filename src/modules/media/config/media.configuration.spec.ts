import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { StorageProviderConfigurationError } from '../providers/errors/storage-provider.errors';
import { buildMediaConfiguration, resolveSelectedWriteProvider } from './media.configuration';

describe('buildMediaConfiguration', () => {
  const baseEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: 'development',
    MEDIA_STORAGE_PROVIDER: 'local',
  };

  it('builds local-first defaults without S3 configuration', () => {
    const configuration = buildMediaConfiguration(baseEnvironment);

    expect(configuration.storageProviderSelection).toBe('local');
    expect(configuration.selectedWriteProvider).toBe(MediaStorageProvider.Local);
    expect(configuration.s3).toBeNull();
    expect(configuration.allowLocalFallback).toBe(false);
    expect(configuration.presignedUrlTtlSeconds).toBe(900);
    expect(configuration.sizeLimits.globalMaxBytes).toBe(104_857_600);
  });

  it('parses size limits from environment variables', () => {
    const configuration = buildMediaConfiguration({
      ...baseEnvironment,
      MEDIA_MAX_IMAGE_BYTES: '2048',
      MEDIA_MAX_DOCUMENT_BYTES: '4096',
      MEDIA_MAX_AUDIO_BYTES: '8192',
      MEDIA_MAX_VIDEO_BYTES: '16384',
    });

    expect(configuration.sizeLimits).toEqual({
      maxImageBytes: 2048,
      maxDocumentBytes: 4096,
      maxAudioBytes: 8192,
      maxVideoBytes: 16384,
      globalMaxBytes: 16384,
    });
  });

  it('requires bucket and region when partial S3 configuration is provided', () => {
    expect(() =>
      buildMediaConfiguration({
        ...baseEnvironment,
        MEDIA_S3_BUCKET: 'demo-bucket',
      }),
    ).toThrow('MEDIA_S3_BUCKET and MEDIA_S3_REGION are required');
  });

  it('requires access key pair to be provided together', () => {
    expect(() =>
      buildMediaConfiguration({
        ...baseEnvironment,
        MEDIA_S3_BUCKET: 'demo-bucket',
        MEDIA_S3_REGION: 'ap-southeast-1',
        MEDIA_S3_ACCESS_KEY_ID: 'access-key',
      }),
    ).toThrow('MEDIA_S3_ACCESS_KEY_ID and MEDIA_S3_SECRET_ACCESS_KEY must be provided together.');
  });

  it('rejects invalid storage provider selection', () => {
    expect(() =>
      buildMediaConfiguration({
        ...baseEnvironment,
        MEDIA_STORAGE_PROVIDER: 'invalid',
      }),
    ).toThrow('MEDIA_STORAGE_PROVIDER must be one of');
  });
});

describe('resolveSelectedWriteProvider', () => {
  const s3Configuration = {
    bucket: 'demo-bucket',
    region: 'ap-southeast-1',
    endpoint: undefined,
    accessKeyId: undefined,
    secretAccessKey: undefined,
    forcePathStyle: false,
    prefix: 'media/',
    publicBaseUrl: undefined,
    readinessProbeEnabled: false,
  };

  it('selects local provider when configured', () => {
    expect(
      resolveSelectedWriteProvider({
        nodeEnv: 'development',
        selection: 'local',
        allowLocalFallback: false,
        s3Configuration: null,
        s3ReadinessPassed: true,
      }),
    ).toBe(MediaStorageProvider.Local);
  });

  it('selects S3 when configured and ready', () => {
    expect(
      resolveSelectedWriteProvider({
        nodeEnv: 'development',
        selection: 's3',
        allowLocalFallback: false,
        s3Configuration,
        s3ReadinessPassed: true,
      }),
    ).toBe(MediaStorageProvider.S3);
  });

  it('falls back to local in non-production when S3 is unavailable and fallback is enabled', () => {
    expect(
      resolveSelectedWriteProvider({
        nodeEnv: 'development',
        selection: 's3',
        allowLocalFallback: true,
        s3Configuration: null,
        s3ReadinessPassed: false,
      }),
    ).toBe(MediaStorageProvider.Local);
  });

  it('rejects auto provider in production', () => {
    expect(() =>
      resolveSelectedWriteProvider({
        nodeEnv: 'production',
        selection: 'auto',
        allowLocalFallback: false,
        s3Configuration,
        s3ReadinessPassed: true,
      }),
    ).toThrow('MEDIA_STORAGE_PROVIDER=auto is not allowed in production.');
  });

  it('rejects local fallback in production', () => {
    expect(() =>
      resolveSelectedWriteProvider({
        nodeEnv: 'production',
        selection: 'local',
        allowLocalFallback: true,
        s3Configuration: null,
        s3ReadinessPassed: true,
      }),
    ).toThrow('MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK must be false in production.');
  });

  it('throws when S3 is required but not ready and fallback is disabled', () => {
    expect(() =>
      resolveSelectedWriteProvider({
        nodeEnv: 'development',
        selection: 's3',
        allowLocalFallback: false,
        s3Configuration,
        s3ReadinessPassed: false,
      }),
    ).toThrow('S3 storage is not ready.');
  });

  it('selects S3 for auto when S3 is configured and ready', () => {
    expect(
      resolveSelectedWriteProvider({
        nodeEnv: 'development',
        selection: 'auto',
        allowLocalFallback: false,
        s3Configuration,
        s3ReadinessPassed: true,
      }),
    ).toBe(MediaStorageProvider.S3);
  });

  it('selects local for auto when S3 is not ready', () => {
    expect(
      resolveSelectedWriteProvider({
        nodeEnv: 'development',
        selection: 'auto',
        allowLocalFallback: false,
        s3Configuration,
        s3ReadinessPassed: false,
      }),
    ).toBe(MediaStorageProvider.Local);
  });
});

describe('buildMediaConfiguration production guardrails', () => {
  it('throws when production uses auto provider', () => {
    expect(() =>
      buildMediaConfiguration({
        NODE_ENV: 'production',
        MEDIA_STORAGE_PROVIDER: 'auto',
        MEDIA_S3_BUCKET: 'demo-bucket',
        MEDIA_S3_REGION: 'ap-southeast-1',
      }),
    ).toThrow(StorageProviderConfigurationError);
  });
});
