import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestWithAuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AccessTokenService } from '../services/access-token.service';
import {
  createInvalidCredentialsException,
  extractBearerAccessToken,
} from '../utils/auth-http.util';

type AuthenticatedRequest = Request & RequestWithAuthenticatedUser;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = extractBearerAccessToken(request.header('authorization') ?? undefined);

    if (accessToken === null) {
      throw createInvalidCredentialsException();
    }

    request.authenticatedUser = await this.accessTokenService.verifyAccessToken(accessToken);

    return true;
  }
}
