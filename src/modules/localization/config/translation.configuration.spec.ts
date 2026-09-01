import { buildTranslationConfiguration } from './translation.configuration';
import { TranslationProviderConfigurationError } from '../providers/errors/translation-provider.errors';
import { TranslationProviderId } from '../enums/translation-provider-id.enum';

describe('buildTranslationConfiguration', () => {
  it('defaults to mock provider in development', () => {
    const configuration = buildTranslationConfiguration({
      NODE_ENV: 'development',
      DB_HOST: 'localhost',
      DB_NAME: 'test',
      DB_USER: 'sa',
      DB_PASSWORD: 'secret',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_HASH_SECRET: 'b'.repeat(32),
    });

    expect(configuration.selectedProvider).toBe(TranslationProviderId.Mock);
  });

  it('disallows mock provider in production by default', () => {
    expect(() =>
      buildTranslationConfiguration({
        NODE_ENV: 'production',
        TRANSLATION_PROVIDER: 'mock',
        DB_HOST: 'localhost',
        DB_NAME: 'test',
        DB_USER: 'sa',
        DB_PASSWORD: 'secret',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_HASH_SECRET: 'b'.repeat(32),
      }),
    ).toThrow(TranslationProviderConfigurationError);
  });

  it('requires google config in production when google provider selected', () => {
    expect(() =>
      buildTranslationConfiguration({
        NODE_ENV: 'production',
        TRANSLATION_PROVIDER: 'google',
        DB_HOST: 'localhost',
        DB_NAME: 'test',
        DB_USER: 'sa',
        DB_PASSWORD: 'secret',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_HASH_SECRET: 'b'.repeat(32),
      }),
    ).toThrow(TranslationProviderConfigurationError);
  });
});
