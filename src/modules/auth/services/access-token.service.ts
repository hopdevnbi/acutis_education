import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AUTH_CONFIGURATION_NAMESPACE,
  INVALID_CREDENTIALS_MESSAGE,
  type AuthConfiguration,
  type JwtAccessTokenPayload,
} from '../config/auth.config.types';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(userId: string, sessionId: string): Promise<string> {
    return this.jwtService.signAsync({
      sub: normalizeUuid(userId),
      sid: normalizeUuid(sessionId),
    });
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessTokenPayload>(token, {
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

  getAccessTokenExpiresInSeconds(): number {
    return this.getAuthConfiguration().accessExpiresInSeconds;
  }

  private getAuthConfiguration(): AuthConfiguration {
    const configuration = this.configService.get<AuthConfiguration>(AUTH_CONFIGURATION_NAMESPACE);

    if (configuration === undefined) {
      throw new Error('Auth configuration is not available.');
    }

    return configuration;
  }
}
