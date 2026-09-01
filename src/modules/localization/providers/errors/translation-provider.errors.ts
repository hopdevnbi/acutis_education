export type TranslationProviderErrorCode =
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'AUTH'
  | 'INVALID_REQUEST'
  | 'PROVIDER_OUTPUT_INVALID'
  | 'UNKNOWN';

export class TranslationProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationProviderConfigurationError';
  }
}

export class TranslationProviderError extends Error {
  readonly code: TranslationProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: TranslationProviderErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'TranslationProviderError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function isRetryableTranslationProviderErrorCode(
  code: TranslationProviderErrorCode,
): boolean {
  return code === 'RATE_LIMIT' || code === 'TIMEOUT' || code === 'UNAVAILABLE';
}
