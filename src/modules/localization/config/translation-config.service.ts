import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TRANSLATION_CONFIGURATION_NAMESPACE,
  type TranslationConfiguration,
} from './translation.config.types';

@Injectable()
export class TranslationConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfiguration(): TranslationConfiguration {
    const configuration = this.configService.get<TranslationConfiguration>(
      TRANSLATION_CONFIGURATION_NAMESPACE,
    );

    if (configuration === undefined) {
      throw new Error('Translation configuration is not loaded.');
    }

    return configuration;
  }
}
