import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIGURATION_NAMESPACE, type AuthConfiguration } from '../config/auth.config.types';

const REFRESH_TOKEN_BYTE_LENGTH = 32;

@Injectable()
export class RefreshTokenService {
  constructor(private readonly configService: ConfigService) {}

  generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('base64url');
  }

  hashRefreshToken(rawRefreshToken: string): string {
    return createHmac('sha256', this.getAuthConfiguration().refreshHashSecret)
      .update(rawRefreshToken)
      .digest('hex');
  }

  getRefreshTokenExpiresInSeconds(): number {
    return this.getAuthConfiguration().refreshExpiresInSeconds;
  }

  private getAuthConfiguration(): AuthConfiguration {
    const configuration = this.configService.get<AuthConfiguration>(AUTH_CONFIGURATION_NAMESPACE);

    if (configuration === undefined) {
      throw new Error('Auth configuration is not available.');
    }

    return configuration;
  }
}
