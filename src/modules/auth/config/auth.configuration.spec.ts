import {
  JWT_ACCESS_SECRET_MIN_LENGTH,
  JWT_REFRESH_HASH_SECRET_MIN_LENGTH,
} from './auth.config.types';
import { buildAuthConfiguration } from './auth.configuration';

describe('buildAuthConfiguration', () => {
  const validEnvironment = {
    JWT_ACCESS_SECRET: 'local-development-jwt-access-secret-32chars-min',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_HASH_SECRET: 'local-development-refresh-hash-secret-32chars-min',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };

  it('builds auth configuration with normalized expiration seconds', () => {
    expect(buildAuthConfiguration(validEnvironment)).toEqual({
      accessSecret: validEnvironment.JWT_ACCESS_SECRET,
      accessExpiresIn: '15m',
      accessExpiresInSeconds: 900,
      refreshHashSecret: validEnvironment.JWT_REFRESH_HASH_SECRET,
      refreshExpiresIn: '7d',
      refreshExpiresInSeconds: 604800,
      loginThrottleLimit: 10,
      loginThrottleTtlMs: 60_000,
      refreshThrottleLimit: 20,
      refreshThrottleTtlMs: 60_000,
    });
  });

  it('defaults JWT_ACCESS_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN when omitted', () => {
    expect(
      buildAuthConfiguration({
        JWT_ACCESS_SECRET: validEnvironment.JWT_ACCESS_SECRET,
        JWT_REFRESH_HASH_SECRET: validEnvironment.JWT_REFRESH_HASH_SECRET,
      }),
    ).toEqual({
      accessSecret: validEnvironment.JWT_ACCESS_SECRET,
      accessExpiresIn: '15m',
      accessExpiresInSeconds: 900,
      refreshHashSecret: validEnvironment.JWT_REFRESH_HASH_SECRET,
      refreshExpiresIn: '7d',
      refreshExpiresInSeconds: 604800,
      loginThrottleLimit: 10,
      loginThrottleTtlMs: 60_000,
      refreshThrottleLimit: 20,
      refreshThrottleTtlMs: 60_000,
    });
  });

  it('parses auth throttle limits from environment variables', () => {
    expect(
      buildAuthConfiguration({
        ...validEnvironment,
        AUTH_LOGIN_THROTTLE_LIMIT: '5',
        AUTH_LOGIN_THROTTLE_TTL_MS: '30000',
        AUTH_REFRESH_THROTTLE_LIMIT: '8',
        AUTH_REFRESH_THROTTLE_TTL_MS: '45000',
      }),
    ).toMatchObject({
      loginThrottleLimit: 5,
      loginThrottleTtlMs: 30_000,
      refreshThrottleLimit: 8,
      refreshThrottleTtlMs: 45_000,
    });
  });

  it('rejects missing JWT_ACCESS_SECRET', () => {
    expect(() => {
      buildAuthConfiguration({
        JWT_REFRESH_HASH_SECRET: validEnvironment.JWT_REFRESH_HASH_SECRET,
      });
    }).toThrow('JWT_ACCESS_SECRET is required.');
  });

  it('rejects missing JWT_REFRESH_HASH_SECRET', () => {
    expect(() => {
      buildAuthConfiguration({
        JWT_ACCESS_SECRET: validEnvironment.JWT_ACCESS_SECRET,
      });
    }).toThrow('JWT_REFRESH_HASH_SECRET is required.');
  });

  it('rejects short JWT_ACCESS_SECRET values', () => {
    expect(() => {
      buildAuthConfiguration({
        JWT_ACCESS_SECRET: 'too-short-secret-value',
        JWT_REFRESH_HASH_SECRET: validEnvironment.JWT_REFRESH_HASH_SECRET,
      });
    }).toThrow(
      `JWT_ACCESS_SECRET must be at least ${String(JWT_ACCESS_SECRET_MIN_LENGTH)} characters long.`,
    );
  });

  it('rejects short JWT_REFRESH_HASH_SECRET values', () => {
    expect(() => {
      buildAuthConfiguration({
        JWT_ACCESS_SECRET: validEnvironment.JWT_ACCESS_SECRET,
        JWT_REFRESH_HASH_SECRET: 'too-short-secret-value',
      });
    }).toThrow(
      `JWT_REFRESH_HASH_SECRET must be at least ${String(JWT_REFRESH_HASH_SECRET_MIN_LENGTH)} characters long.`,
    );
  });
});
