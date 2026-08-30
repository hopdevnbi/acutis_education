import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RequestWithAuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { REQUIRE_PERMISSIONS_METADATA_KEY } from '../constants/require-permissions-metadata.constants';
import { PermissionGuard } from './permission.guard';
import { AccessControlService } from '../services/access-control.service';

type AuthenticatedRequest = Request & RequestWithAuthenticatedUser;

describe('PermissionGuard', () => {
  let permissionGuard: PermissionGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let accessControlService: jest.Mocked<Pick<AccessControlService, 'getEffectivePermissions'>>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    accessControlService = {
      getEffectivePermissions: jest.fn(),
    };

    permissionGuard = new PermissionGuard(
      reflector as unknown as Reflector,
      accessControlService as unknown as AccessControlService,
    );
  });

  function createExecutionContext(request: AuthenticatedRequest): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  it('allows authenticated requests when no permissions metadata is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      permissionGuard.canActivate(createExecutionContext({} as AuthenticatedRequest)),
    ).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_PERMISSIONS_METADATA_KEY, [
      expect.any(Object),
      expect.any(Object),
    ]);
  });

  it('allows authenticated users with all required permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(['test.read', 'test.manage']);
    accessControlService.getEffectivePermissions.mockResolvedValue([
      'test.manage',
      'test.read',
      'users.read',
    ]);

    const request = {
      authenticatedUser: {
        userId: '11111111-1111-4111-8111-111111111111',
        sessionId: '22222222-2222-4222-8222-222222222222',
      },
    } as AuthenticatedRequest;

    await expect(permissionGuard.canActivate(createExecutionContext(request))).resolves.toBe(true);
  });

  it('returns 403 when a required permission is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['test.manage']);
    accessControlService.getEffectivePermissions.mockResolvedValue(['test.read']);

    const request = {
      authenticatedUser: {
        userId: '11111111-1111-4111-8111-111111111111',
        sessionId: '22222222-2222-4222-8222-222222222222',
      },
    } as AuthenticatedRequest;

    await expect(
      permissionGuard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 401 when authentication context is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['test.read']);

    await expect(
      permissionGuard.canActivate(createExecutionContext({} as AuthenticatedRequest)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
