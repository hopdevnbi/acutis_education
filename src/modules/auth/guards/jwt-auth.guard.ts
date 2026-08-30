import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_CONFIGURATION_NAMESPACE, type AuthConfiguration } from '../config/auth.config.types';
import type { RequestWithAuthenticatedUser } from '../interfaces/authenticated-user.interface';
import {
  createInvalidCredentialsException,
  extractBearerAccessToken,
} from '../utils/auth-http.util';
import {
  resolveAccessSecret,
  verifyAccessTokenValue,
} from '../utils/access-token-verification.util';

type AuthenticatedRequest = Request & RequestWithAuthenticatedUser;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = extractBearerAccessToken(request.header('authorization') ?? undefined);

    if (accessToken === null) {
      throw createInvalidCredentialsException();
    }

    request.authenticatedUser = await verifyAccessTokenValue(
      this.jwtService,
      resolveAccessSecret(this.getAuthConfiguration()),
      accessToken,
    );

    return true;
  }

  private getAuthConfiguration(): AuthConfiguration {
    const configuration = this.configService.get<AuthConfiguration>(AUTH_CONFIGURATION_NAMESPACE);

    if (configuration === undefined) {
      throw new Error('Auth configuration is not available.');
    }

    return configuration;
  }
}
