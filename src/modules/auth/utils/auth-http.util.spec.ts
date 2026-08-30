import { extractBearerAccessToken } from './auth-http.util';

describe('extractBearerAccessToken', () => {
  it('extracts bearer tokens from Authorization headers', () => {
    expect(extractBearerAccessToken('Bearer access-token-value')).toBe('access-token-value');
  });

  it('rejects missing, malformed, or non-bearer schemes', () => {
    expect(extractBearerAccessToken(undefined)).toBeNull();
    expect(extractBearerAccessToken('Basic abc123')).toBeNull();
    expect(extractBearerAccessToken('Bearer')).toBeNull();
    expect(extractBearerAccessToken('Token access-token-value')).toBeNull();
  });
});
