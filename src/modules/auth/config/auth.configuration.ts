import { registerAs } from '@nestjs/config';
import {
  AUTH_CONFIGURATION_NAMESPACE,
  FORBIDDEN_JWT_ACCESS_SECRETS,
  FORBIDDEN_JWT_REFRESH_HASH_SECRETS,
  JWT_ACCESS_SECRET_MIN_LENGTH,
  JWT_REFRESH_HASH_SECRET_MIN_LENGTH,
  type AuthConfiguration,
} from './auth.config.types';
import { parseDurationToSeconds } from './parse-duration-to-seconds';

function parseRequiredSecret(
  rawValue: string | undefined,
  variableName: string,
  minLength: number,
  forbiddenValues: readonly string[],
): string {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    throw new Error(`${variableName} is required.`);
  }

  const normalizedSecret = rawValue.trim();

  if (normalizedSecret.length < minLength) {
    throw new Error(`${variableName} must be at least ${String(minLength)} characters long.`);
  }

  const forbiddenSecret = forbiddenValues.find(
    (candidate) => candidate === normalizedSecret.toLowerCase(),
  );

  if (forbiddenSecret !== undefined) {
    throw new Error(`${variableName} uses a forbidden placeholder value.`);
  }

  return normalizedSecret;
}

function parseDurationConfig(
  rawValue: string | undefined,
  defaultValue: string,
): { duration: string; durationSeconds: number } {
  const normalizedValue = rawValue?.trim();

  if (normalizedValue === undefined || normalizedValue.length === 0) {
    return {
      duration: defaultValue,
      durationSeconds: parseDurationToSeconds(defaultValue),
    };
  }

  return {
    duration: normalizedValue,
    durationSeconds: parseDurationToSeconds(normalizedValue),
  };
}

function parsePositiveInteger(rawValue: string | undefined, defaultValue: number): number {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid throttle configuration value: ${rawValue}`);
  }

  return parsedValue;
}

export function buildAuthConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): AuthConfiguration {
  const accessExpires = parseDurationConfig(environment['JWT_ACCESS_EXPIRES_IN'], '15m');
  const refreshExpires = parseDurationConfig(environment['JWT_REFRESH_EXPIRES_IN'], '7d');

  return {
    accessSecret: parseRequiredSecret(
      environment['JWT_ACCESS_SECRET'],
      'JWT_ACCESS_SECRET',
      JWT_ACCESS_SECRET_MIN_LENGTH,
      FORBIDDEN_JWT_ACCESS_SECRETS,
    ),
    accessExpiresIn: accessExpires.duration,
    accessExpiresInSeconds: accessExpires.durationSeconds,
    refreshHashSecret: parseRequiredSecret(
      environment['JWT_REFRESH_HASH_SECRET'],
      'JWT_REFRESH_HASH_SECRET',
      JWT_REFRESH_HASH_SECRET_MIN_LENGTH,
      FORBIDDEN_JWT_REFRESH_HASH_SECRETS,
    ),
    refreshExpiresIn: refreshExpires.duration,
    refreshExpiresInSeconds: refreshExpires.durationSeconds,
    loginThrottleLimit: parsePositiveInteger(environment['AUTH_LOGIN_THROTTLE_LIMIT'], 10),
    loginThrottleTtlMs: parsePositiveInteger(environment['AUTH_LOGIN_THROTTLE_TTL_MS'], 60_000),
    refreshThrottleLimit: parsePositiveInteger(environment['AUTH_REFRESH_THROTTLE_LIMIT'], 20),
    refreshThrottleTtlMs: parsePositiveInteger(environment['AUTH_REFRESH_THROTTLE_TTL_MS'], 60_000),
  };
}

export default registerAs(AUTH_CONFIGURATION_NAMESPACE, () => buildAuthConfiguration(process.env));
