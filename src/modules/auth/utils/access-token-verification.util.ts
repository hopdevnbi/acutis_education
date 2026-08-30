import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  INVALID_CREDENTIALS_MESSAGE,
  type AuthConfiguration,
  type JwtAccessTokenPayload,
} from '../config/auth.config.types';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export async function verifyAccessTokenValue(
  jwtService: JwtService,
  accessSecret: string,
  token: string,
): Promise<AuthenticatedUser> {
  try {
    const payload = await jwtService.verifyAsync<JwtAccessTokenPayload>(token, {
      secret: accessSecret,
      algorithms: ['HS256'],
    });

    if (typeof payload.sub !== 'string' || !isUuidV4(payload.sub)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (typeof payload.sid !== 'string' || !isUuidV4(payload.sid)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      userId: normalizeUuid(payload.sub),
      sessionId: normalizeUuid(payload.sid),
    };
  } catch (error: unknown) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  }
}

export function resolveAccessSecret(authConfiguration: AuthConfiguration): string {
  return authConfiguration.accessSecret;
}
