import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_REFRESH_COOKIE_NAME } from '../config/auth.config.types';

export function extractBearerAccessToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || token === undefined || token.trim().length === 0) {
    return null;
  }

  return token.trim();
}

export function extractRefreshTokenFromRequest(request: Request): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const cookieValue = cookies?.[AUTH_REFRESH_COOKIE_NAME];

  if (typeof cookieValue !== 'string' || cookieValue.trim().length === 0) {
    return null;
  }

  return cookieValue.trim();
}

export function createInvalidCredentialsException(): UnauthorizedException {
  return new UnauthorizedException('Invalid credentials');
}
