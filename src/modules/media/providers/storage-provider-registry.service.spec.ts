import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import type { MediaConfiguration } from '../config/media.config.types';
import { StorageProviderConfigurationError } from './errors/storage-provider.errors';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { StorageProviderRegistry } from './storage-provider-registry.service';

describe('StorageProviderRegistry', () => {
  const mediaConfiguration: MediaConfiguration = {
    storageProviderSelection: 'local',
    allowLocalFallback: false,
    localRoot: '/tmp/media-root',
    selectedWriteProvider: MediaStorageProvider.Local,
    s3: null,
    sizeLimits: {
      maxImageBytes: 1,
      maxDocumentBytes: 1,
      maxAudioBytes: 1,
      maxVideoBytes: 1,
      globalMaxBytes: 1,
    },
    presignedUrlTtlSeconds: 900,
  };

  let localInitializeMock: jest.Mock;
  let localStorageProvider: LocalStorageProvider;
  let registry: StorageProviderRegistry;

  beforeEach(() => {
    localInitializeMock = jest.fn().mockResolvedValue(undefined);
    localStorageProvider = {
      providerId: MediaStorageProvider.Local,
      initialize: localInitializeMock,
      putObject: jest.fn(),
      getObject: jest.fn(),
      deleteObject: jest.fn(),
      exists: jest.fn(),
    } as unknown as LocalStorageProvider;

    registry = new StorageProviderRegistry(mediaConfiguration, localStorageProvider, null);
  });

  it('registers local provider and exposes it as write provider', async () => {
    await registry.initialize();

    expect(localInitializeMock).toHaveBeenCalled();
    expect(registry.getWriteProvider()).toBe(localStorageProvider);
    expect(registry.getProviderById(MediaStorageProvider.Local)).toBe(localStorageProvider);
  });

  it('registers S3 provider when configured', async () => {
    const s3StorageProvider = {
      providerId: MediaStorageProvider.S3,
      initialize: jest.fn(),
      putObject: jest.fn(),
      getObject: jest.fn(),
      deleteObject: jest.fn(),
      exists: jest.fn(),
    } as unknown as S3StorageProvider;

    const s3Registry = new StorageProviderRegistry(
      {
        ...mediaConfiguration,
        selectedWriteProvider: MediaStorageProvider.S3,
      },
      localStorageProvider,
      s3StorageProvider,
    );

    await s3Registry.initialize();

    expect(s3Registry.getWriteProvider()).toBe(s3StorageProvider);
    expect(s3Registry.getProviderById(MediaStorageProvider.S3)).toBe(s3StorageProvider);
  });

  it('throws when selected write provider is unavailable', async () => {
    const brokenRegistry = new StorageProviderRegistry(
      {
        ...mediaConfiguration,
        selectedWriteProvider: MediaStorageProvider.S3,
      },
      localStorageProvider,
      null,
    );

    await expect(brokenRegistry.initialize()).rejects.toBeInstanceOf(
      StorageProviderConfigurationError,
    );
  });

  it('throws when resolving an unregistered provider id', async () => {
    await registry.initialize();

    expect(() => registry.getProviderById(MediaStorageProvider.S3)).toThrow(
      'Storage provider "s3" is not registered.',
    );
  });
});
