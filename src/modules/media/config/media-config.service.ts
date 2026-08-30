import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MEDIA_CONFIGURATION_NAMESPACE,
  type MediaConfiguration,
} from '../config/media.config.types';

@Injectable()
export class MediaConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfiguration(): MediaConfiguration {
    const configuration = this.configService.get<MediaConfiguration>(MEDIA_CONFIGURATION_NAMESPACE);

    if (configuration === undefined) {
      throw new Error('Media configuration is not available.');
    }

    return configuration;
  }
}
