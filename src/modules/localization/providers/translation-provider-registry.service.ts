import { Injectable } from '@nestjs/common';
import { TranslationProviderId } from '../enums/translation-provider-id.enum';
import { TranslationConfigService } from '../config/translation-config.service';
import { TranslationProviderConfigurationError } from './errors/translation-provider.errors';
import { GoogleCloudTranslationProvider } from './google-cloud-translation.provider';
import { MockTranslationProvider } from './mock-translation.provider';
import type { TranslationProvider } from './translation-provider.interface';

@Injectable()
export class TranslationProviderRegistry {
  private readonly providers = new Map<TranslationProviderId, TranslationProvider>();
  private selectedProvider?: TranslationProvider;

  constructor(
    private readonly translationConfigService: TranslationConfigService,
    private readonly mockTranslationProvider: MockTranslationProvider,
    private readonly googleCloudTranslationProvider: GoogleCloudTranslationProvider,
  ) {}

  initialize(): void {
    this.providers.set(TranslationProviderId.Mock, this.mockTranslationProvider);
    this.providers.set(TranslationProviderId.Google, this.googleCloudTranslationProvider);

    const configuration = this.translationConfigService.getConfiguration();
    const selected = this.providers.get(configuration.selectedProvider);

    if (selected === undefined) {
      throw new TranslationProviderConfigurationError(
        `Translation provider "${configuration.selectedProvider}" is not registered.`,
      );
    }

    this.selectedProvider = selected;
  }

  getSelectedProvider(): TranslationProvider {
    if (this.selectedProvider === undefined) {
      this.initialize();
    }

    return this.selectedProvider as TranslationProvider;
  }

  getProviderById(providerId: TranslationProviderId): TranslationProvider {
    if (this.providers.size === 0) {
      this.initialize();
    }

    const provider = this.providers.get(providerId);

    if (provider === undefined) {
      throw new TranslationProviderConfigurationError(
        `Translation provider "${providerId}" is not registered.`,
      );
    }

    return provider;
  }
}
