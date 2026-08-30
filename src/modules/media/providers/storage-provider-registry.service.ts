import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import type { MediaConfiguration } from '../config/media.config.types';
import { StorageProviderConfigurationError } from './errors/storage-provider.errors';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import type { StorageProvider } from './storage-provider.interface';
import { MEDIA_RUNTIME_CONFIGURATION } from '../media.constants';

@Injectable()
export class StorageProviderRegistry {
  private readonly logger = new Logger(StorageProviderRegistry.name);
  private readonly providers = new Map<MediaStorageProvider, StorageProvider>();
  private writeProvider!: StorageProvider;

  constructor(
    @Inject(MEDIA_RUNTIME_CONFIGURATION)
    private readonly mediaConfiguration: MediaConfiguration,
    private readonly localStorageProvider: LocalStorageProvider,
    @Optional() private readonly s3StorageProvider: S3StorageProvider | null,
  ) {}

  async initialize(): Promise<void> {
    await this.localStorageProvider.initialize();
    this.providers.set(MediaStorageProvider.Local, this.localStorageProvider);

    if (this.s3StorageProvider !== null) {
      this.providers.set(MediaStorageProvider.S3, this.s3StorageProvider);
    }

    const selectedProvider = this.providers.get(this.mediaConfiguration.selectedWriteProvider);

    if (selectedProvider === undefined) {
      throw new StorageProviderConfigurationError(
        `Selected write provider "${this.mediaConfiguration.selectedWriteProvider}" is not available.`,
      );
    }

    this.writeProvider = selectedProvider;

    if (
      this.mediaConfiguration.selectedWriteProvider === MediaStorageProvider.Local &&
      this.mediaConfiguration.storageProviderSelection === 's3'
    ) {
      this.logger.warn(
        'S3 was requested but local storage is selected for new writes after configuration/fallback resolution.',
      );
    }
  }

  getWriteProvider(): StorageProvider {
    return this.writeProvider;
  }

  getProviderById(providerId: MediaStorageProvider): StorageProvider {
    const provider = this.providers.get(providerId);

    if (provider === undefined) {
      throw new StorageProviderConfigurationError(
        `Storage provider "${providerId}" is not registered.`,
      );
    }

    return provider;
  }
}
