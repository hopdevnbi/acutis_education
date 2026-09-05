import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import {
  AUTH_CONFIGURATION_NAMESPACE,
  type AuthConfiguration,
} from '../../auth/config/auth.config.types';
import type { RequestWithAuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  resolveAccessSecret,
  verifyAccessTokenValue,
} from '../../auth/utils/access-token-verification.util';
import { extractBearerAccessToken } from '../../auth/utils/auth-http.util';

type MaybeAuthenticatedRequest = Request & RequestWithAuthenticatedUser;

/**
 * Guard that extracts and verifies Bearer token if present.
 * If Authorization header is absent, allows request through as anonymous (authenticatedUser remains undefined).
 * If Authorization header is present but invalid/expired, throws UnauthorizedException.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MaybeAuthenticatedRequest>();
    const authHeader = request.header('authorization');

    if (!authHeader) {
      return true;
    }

    const accessToken = extractBearerAccessToken(authHeader);
    if (!accessToken) {
      return true;
    }

    const configuration = this.getAuthConfiguration();
    const accessSecret = resolveAccessSecret(configuration);

    request.authenticatedUser = await verifyAccessTokenValue(
      this.jwtService,
      accessSecret,
      accessToken,
    );

    return true;
  }

  private getAuthConfiguration(): AuthConfiguration {
    const configuration = this.configService.get<AuthConfiguration>(AUTH_CONFIGURATION_NAMESPACE);
    if (!configuration) {
      throw new Error('Auth configuration is not available.');
    }
    return configuration;
  }
}
