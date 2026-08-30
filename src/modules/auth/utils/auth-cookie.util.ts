import type { CookieOptions, Response } from 'express';
import type { NodeEnvironment } from '../../../config/config.types';
import { AUTH_REFRESH_COOKIE_NAME, AUTH_REFRESH_COOKIE_PATH } from '../config/auth.config.types';

export interface RefreshCookieOptionsInput {
  readonly nodeEnv: NodeEnvironment;
  readonly maxAgeSeconds: number;
}

export function buildRefreshTokenCookieOptions(input: RefreshCookieOptionsInput): CookieOptions {
  return {
    httpOnly: true,
    secure: input.nodeEnv === 'production',
    sameSite: 'lax',
    path: AUTH_REFRESH_COOKIE_PATH,
    maxAge: input.maxAgeSeconds * 1000,
  };
}

export function setRefreshTokenCookie(
  response: Response,
  rawRefreshToken: string,
  input: RefreshCookieOptionsInput,
): void {
  response.cookie(AUTH_REFRESH_COOKIE_NAME, rawRefreshToken, buildRefreshTokenCookieOptions(input));
}

export function clearRefreshTokenCookie(response: Response, nodeEnv: NodeEnvironment): void {
  response.clearCookie(
    AUTH_REFRESH_COOKIE_NAME,
    buildRefreshTokenCookieOptions({
      nodeEnv,
      maxAgeSeconds: 0,
    }),
  );
}
