import { mapGoogleTranslationError } from './map-google-translation-error.util';

describe('mapGoogleTranslationError', () => {
  it('maps rate limit responses as retryable', () => {
    const mapped = mapGoogleTranslationError({
      response: { status: 429, data: { error: { message: 'Quota exceeded' } } },
    });

    expect(mapped.code).toBe('RATE_LIMIT');
    expect(mapped.retryable).toBe(true);
  });

  it('maps auth failures as nonretryable', () => {
    const mapped = mapGoogleTranslationError({
      response: { status: 403, data: { error: { message: 'Forbidden' } } },
    });

    expect(mapped.code).toBe('AUTH');
    expect(mapped.retryable).toBe(false);
  });

  it('maps abort errors as timeout', () => {
    const mapped = mapGoogleTranslationError(
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    );

    expect(mapped.code).toBe('TIMEOUT');
    expect(mapped.retryable).toBe(true);
  });
});
