import { Injectable } from '@nestjs/common';
import {
  SYSTEM_DEFAULT_LOCALE,
  parseAcceptLanguageHeader,
  parseLocale,
} from '../../../common/locale';
import type {
  LocaleResolutionInput,
  LocaleResolutionResult,
} from '../interfaces/localization.interface';

@Injectable()
export class LocaleResolutionService {
  resolveLocale(input: LocaleResolutionInput): LocaleResolutionResult {
    const explicitLocale = this.tryParseOptionalLocale(input.explicitLocale);

    if (explicitLocale !== null) {
      return {
        requestedLocale: explicitLocale,
        resolvedLocale: explicitLocale,
        resolutionSource: 'explicit',
      };
    }

    const userPreferredLocale = this.tryParseOptionalLocale(input.userPreferredLocale);

    if (userPreferredLocale !== null) {
      return {
        requestedLocale: userPreferredLocale,
        resolvedLocale: userPreferredLocale,
        resolutionSource: 'user_preference',
      };
    }

    const acceptLanguageEntries = parseAcceptLanguageHeader(input.acceptLanguageHeader ?? null);

    if (acceptLanguageEntries.length > 0) {
      const resolvedLocale = acceptLanguageEntries[0]?.locale ?? SYSTEM_DEFAULT_LOCALE;

      return {
        requestedLocale: resolvedLocale,
        resolvedLocale,
        resolutionSource: 'accept_language',
      };
    }

    const parishDefaultLocale = this.tryParseOptionalLocale(input.parishDefaultLocale);

    if (parishDefaultLocale !== null) {
      return {
        requestedLocale: parishDefaultLocale,
        resolvedLocale: parishDefaultLocale,
        resolutionSource: 'parish_default',
      };
    }

    return {
      requestedLocale: null,
      resolvedLocale: SYSTEM_DEFAULT_LOCALE,
      resolutionSource: 'system_default',
    };
  }

  private tryParseOptionalLocale(rawLocale: string | null | undefined): string | null {
    if (rawLocale === null || rawLocale === undefined) {
      return null;
    }

    const trimmed = rawLocale.trim();

    if (trimmed.length === 0) {
      return null;
    }

    try {
      return parseLocale(trimmed);
    } catch {
      return null;
    }
  }
}
