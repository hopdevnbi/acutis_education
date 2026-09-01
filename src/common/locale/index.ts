import { parseLocale, normalizeLocale } from './parse-locale.util';
import { parseAcceptLanguageHeader } from './parse-accept-language.util';
import { InvalidLocaleError } from './locale.errors';
import {
  LOCALE_MAX_LENGTH,
  MAX_ACCEPT_LANGUAGE_ENTRIES,
  MAX_TRANSLATION_PAYLOAD_BYTES,
  SOURCE_CONTENT_HASH_LENGTH,
  SOURCE_CONTENT_HASH_PATTERN,
  SYSTEM_DEFAULT_LOCALE,
} from './locale.constants';

export {
  InvalidLocaleError,
  LOCALE_MAX_LENGTH,
  MAX_ACCEPT_LANGUAGE_ENTRIES,
  MAX_TRANSLATION_PAYLOAD_BYTES,
  SOURCE_CONTENT_HASH_LENGTH,
  SOURCE_CONTENT_HASH_PATTERN,
  SYSTEM_DEFAULT_LOCALE,
  normalizeLocale,
  parseAcceptLanguageHeader,
  parseLocale,
};

export type { ParsedAcceptLanguageEntry } from './parse-accept-language.util';
