import { normalizeUuid } from '../../../database/uuid-v4.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AUTH_CONFIGURATION_NAMESPACE, type AuthConfiguration } from '../config/auth.config.types';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import {
  resolveAccessSecret,
  verifyAccessTokenValue,
} from '../utils/access-token-verification.util';

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
    return verifyAccessTokenValue(
      this.jwtService,
      resolveAccessSecret(this.getAuthConfiguration()),
      token,
    );
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
