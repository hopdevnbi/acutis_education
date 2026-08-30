import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RequestWithAuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { REQUIRE_PERMISSIONS_METADATA_KEY } from '../constants/require-permissions-metadata.constants';
import { AccessControlService } from '../services/access-control.service';

const FORBIDDEN_MESSAGE = 'Forbidden' as const;
const UNAUTHORIZED_MESSAGE = 'Invalid credentials' as const;

type AuthenticatedRequest = Request & RequestWithAuthenticatedUser;

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions === undefined || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authenticatedUser = request.authenticatedUser;

    if (authenticatedUser === undefined) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    const effectivePermissions = await this.accessControlService.getEffectivePermissions(
      authenticatedUser.userId,
    );
    const effectivePermissionSet = new Set(effectivePermissions);

    for (const permissionCode of requiredPermissions) {
      if (!effectivePermissionSet.has(permissionCode)) {
        throw new ForbiddenException(FORBIDDEN_MESSAGE);
      }
    }

    return true;
  }
}
