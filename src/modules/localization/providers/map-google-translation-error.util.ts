export type GoogleTranslationErrorShape = {
  readonly code?: number | string;
  readonly message?: string;
  readonly status?: string;
};

export function mapGoogleTranslationError(error: unknown): {
  readonly code: 'RATE_LIMIT' | 'TIMEOUT' | 'UNAVAILABLE' | 'AUTH' | 'INVALID_REQUEST' | 'UNKNOWN';
  readonly retryable: boolean;
  readonly message: string;
} {
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      code: 'TIMEOUT',
      retryable: true,
      message: 'Google translation request timed out.',
    };
  }

  const shape = extractGoogleErrorShape(error);
  const statusCode = parseStatusCode(shape);
  const statusText = (shape.status ?? '').toUpperCase();
  const message = sanitizeGoogleErrorMessage(shape.message);

  if (statusCode === 429 || statusText.includes('RESOURCE_EXHAUSTED')) {
    return { code: 'RATE_LIMIT', retryable: true, message };
  }

  if (statusCode === 408 || statusText.includes('DEADLINE_EXCEEDED')) {
    return { code: 'TIMEOUT', retryable: true, message };
  }

  if (statusCode !== null && statusCode >= 500) {
    return { code: 'UNAVAILABLE', retryable: true, message };
  }

  if (statusCode === 401 || statusCode === 403 || statusText.includes('UNAUTHENTICATED')) {
    return { code: 'AUTH', retryable: false, message };
  }

  if (statusCode === 400 || statusText.includes('INVALID_ARGUMENT')) {
    return { code: 'INVALID_REQUEST', retryable: false, message };
  }

  if (statusText.includes('UNAVAILABLE')) {
    return { code: 'UNAVAILABLE', retryable: true, message };
  }

  return { code: 'UNKNOWN', retryable: false, message };
}

function extractGoogleErrorShape(error: unknown): GoogleTranslationErrorShape {
  if (typeof error !== 'object' || error === null) {
    return { message: 'Unknown Google translation error.' };
  }

  const candidate = error as {
    code?: number | string;
    message?: string;
    status?: string;
    response?: { status?: number; data?: { error?: GoogleTranslationErrorShape } };
  };

  if (candidate.response?.data?.error !== undefined) {
    return {
      code: candidate.response.data.error.code ?? candidate.response.status,
      message: candidate.response.data.error.message,
      status: candidate.response.data.error.status,
    };
  }

  return {
    code: candidate.code,
    message: candidate.message,
    status: candidate.status,
  };
}

function parseStatusCode(shape: GoogleTranslationErrorShape): number | null {
  if (typeof shape.code === 'number') {
    return shape.code;
  }

  if (typeof shape.code === 'string') {
    const parsed = Number.parseInt(shape.code, 10);

    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function sanitizeGoogleErrorMessage(message: string | undefined): string {
  if (message === undefined || message.trim().length === 0) {
    return 'Google translation request failed.';
  }

  return message.trim().slice(0, 500);
}
