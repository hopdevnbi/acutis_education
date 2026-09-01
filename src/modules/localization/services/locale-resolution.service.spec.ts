import { SYSTEM_DEFAULT_LOCALE } from '../../../common/locale';
import { LocaleResolutionService } from './locale-resolution.service';

describe('LocaleResolutionService', () => {
  const service = new LocaleResolutionService();

  it('prefers explicit locale over user preference and Accept-Language', () => {
    expect(
      service.resolveLocale({
        explicitLocale: ' fr-fr ',
        userPreferredLocale: 'en-US',
        acceptLanguageHeader: 'vi-VN',
        parishDefaultLocale: 'de-DE',
      }),
    ).toEqual({
      requestedLocale: 'fr-FR',
      resolvedLocale: 'fr-FR',
      resolutionSource: 'explicit',
    });
  });

  it('falls back through user, Accept-Language, parish, and system defaults', () => {
    expect(
      service.resolveLocale({
        userPreferredLocale: ' en-us ',
      }),
    ).toEqual({
      requestedLocale: 'en-US',
      resolvedLocale: 'en-US',
      resolutionSource: 'user_preference',
    });

    expect(
      service.resolveLocale({
        acceptLanguageHeader: 'vi-VN, en-US;q=0.8',
      }),
    ).toEqual({
      requestedLocale: 'vi-VN',
      resolvedLocale: 'vi-VN',
      resolutionSource: 'accept_language',
    });

    expect(
      service.resolveLocale({
        parishDefaultLocale: 'fr-FR',
      }),
    ).toEqual({
      requestedLocale: 'fr-FR',
      resolvedLocale: 'fr-FR',
      resolutionSource: 'parish_default',
    });

    expect(service.resolveLocale({})).toEqual({
      requestedLocale: null,
      resolvedLocale: SYSTEM_DEFAULT_LOCALE,
      resolutionSource: 'system_default',
    });
  });

  it('ignores invalid optional locale values', () => {
    expect(
      service.resolveLocale({
        explicitLocale: 'invalid',
        userPreferredLocale: 'en-US',
      }),
    ).toEqual({
      requestedLocale: 'en-US',
      resolvedLocale: 'en-US',
      resolutionSource: 'user_preference',
    });
  });
});
