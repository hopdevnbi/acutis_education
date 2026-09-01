import { LOCALE_MAX_LENGTH } from './locale.constants';
import { InvalidLocaleError } from './locale.errors';

const BCP47_LIKE_PATTERN = /^[a-z]{2,3}(-[A-Z]{2})?(-[a-z0-9]{2,8})*$/i;

export function normalizeLocale(rawLocale: string): string {
  const trimmed = rawLocale.trim();

  if (trimmed.length === 0 || trimmed.length > LOCALE_MAX_LENGTH) {
    throw new InvalidLocaleError();
  }

  const segments = trimmed.split('-');

  if (segments.length === 1) {
    return segments[0].toLowerCase();
  }

  const language = segments[0].toLowerCase();
  const region = segments[1];

  if (region.length === 2) {
    return [language, region.toUpperCase(), ...segments.slice(2)].join('-');
  }

  return [language, ...segments.slice(1).map((segment) => segment.toLowerCase())].join('-');
}

export function parseLocale(rawLocale: string): string {
  const normalized = normalizeLocale(rawLocale);

  if (!BCP47_LIKE_PATTERN.test(normalized)) {
    throw new InvalidLocaleError();
  }

  return normalized;
}
