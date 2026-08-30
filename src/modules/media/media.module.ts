import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildMediaConfiguration } from './config/media.configuration';
import { MediaConfigService } from './config/media-config.service';
import type { MediaConfiguration } from './config/media.config.types';
import { MediaAssetEntity } from './entities/media-asset.entity';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { probeS3Readiness, S3StorageProvider } from './providers/s3-storage.provider';
import { StorageProviderRegistry } from './providers/storage-provider-registry.service';
import { MediaAssetService } from './services/media-asset.service';

import { MEDIA_RUNTIME_CONFIGURATION } from './media.constants';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAssetEntity])],
  providers: [
    MediaConfigService,
    {
      provide: MEDIA_RUNTIME_CONFIGURATION,
      useFactory: async (): Promise<MediaConfiguration> => {
        const preliminaryConfiguration = buildMediaConfiguration(process.env);

        if (
          preliminaryConfiguration.s3 === null ||
          !preliminaryConfiguration.s3.readinessProbeEnabled
        ) {
          return preliminaryConfiguration;
        }

        const readinessPassed = await probeS3Readiness(preliminaryConfiguration.s3);

        return buildMediaConfiguration(process.env, { s3ReadinessPassed: readinessPassed });
      },
    },
    {
      provide: LocalStorageProvider,
      useFactory: (mediaConfiguration: MediaConfiguration) =>
        new LocalStorageProvider(mediaConfiguration.localRoot),
      inject: [MEDIA_RUNTIME_CONFIGURATION],
    },
    {
      provide: S3StorageProvider,
      useFactory: (mediaConfiguration: MediaConfiguration) => {
        if (mediaConfiguration.s3 === null) {
          return null;
        }

        return new S3StorageProvider(mediaConfiguration.s3);
      },
      inject: [MEDIA_RUNTIME_CONFIGURATION],
    },
    StorageProviderRegistry,
    MediaAssetService,
  ],
  exports: [MediaAssetService],
})
export class MediaModule implements OnModuleInit {
  constructor(private readonly storageProviderRegistry: StorageProviderRegistry) {}

  async onModuleInit(): Promise<void> {
    await this.storageProviderRegistry.initialize();
  }
}
