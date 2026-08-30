export const AUTH_CONFIGURATION_NAMESPACE = 'auth' as const;

export interface AuthConfiguration {
  readonly accessSecret: string;
  readonly accessExpiresIn: string;
  readonly accessExpiresInSeconds: number;
  readonly refreshHashSecret: string;
  readonly refreshExpiresIn: string;
  readonly refreshExpiresInSeconds: number;
  readonly loginThrottleLimit: number;
  readonly loginThrottleTtlMs: number;
  readonly refreshThrottleLimit: number;
  readonly refreshThrottleTtlMs: number;
}

export interface JwtAccessTokenPayload {
  readonly sub: string;
  readonly sid: string;
}

export const JWT_ACCESS_TOKEN_TYPE = 'Bearer' as const;

export const AUTH_REFRESH_COOKIE_NAME = 'catechism_refresh_token' as const;

export const AUTH_REFRESH_COOKIE_PATH = '/api/v1/auth' as const;

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials' as const;

export const FORBIDDEN_JWT_ACCESS_SECRETS = ['secret', 'changeme', 'development-secret'] as const;

export const FORBIDDEN_JWT_REFRESH_HASH_SECRETS = [
  'secret',
  'changeme',
  'development-secret',
] as const;

export const JWT_ACCESS_SECRET_MIN_LENGTH = 32 as const;

export const JWT_REFRESH_HASH_SECRET_MIN_LENGTH = 32 as const;
