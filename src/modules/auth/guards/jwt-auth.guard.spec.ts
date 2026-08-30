import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_CONFIGURATION_NAMESPACE } from '../config/auth.config.types';
import type { RequestWithAuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthenticatedRequest = Request &
  RequestWithAuthenticatedUser & {
    header: jest.Mock<string | undefined, [name: string]>;
  };

describe('JwtAuthGuard', () => {
  let jwtAuthGuard: JwtAuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((namespace: string) => {
        if (namespace === AUTH_CONFIGURATION_NAMESPACE) {
          return {
            accessSecret: 'test-only-jwt-access-secret-32chars-minimum-value',
            accessExpiresInSeconds: 900,
          };
        }

        return undefined;
      }),
    };

    jwtAuthGuard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  function createExecutionContext(request: AuthenticatedRequest): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  it('attaches authenticated user context for valid bearer tokens', async () => {
    const request = {
      header: jest.fn().mockReturnValue('Bearer signed-access-token'),
    } as AuthenticatedRequest;

    jwtService.verifyAsync.mockResolvedValue({
      sub: '11111111-1111-4111-8111-111111111111',
      sid: '22222222-2222-4222-8222-222222222222',
    });

    await expect(jwtAuthGuard.canActivate(createExecutionContext(request))).resolves.toBe(true);
    expect(request.authenticatedUser).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      sessionId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('rejects missing or malformed Authorization headers', async () => {
    const missingHeaderRequest = {
      header: jest.fn().mockReturnValue(undefined),
    } as AuthenticatedRequest;
    const malformedHeaderRequest = {
      header: jest.fn().mockReturnValue('Token signed-access-token'),
    } as AuthenticatedRequest;

    await expect(
      jwtAuthGuard.canActivate(createExecutionContext(missingHeaderRequest)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      jwtAuthGuard.canActivate(createExecutionContext(malformedHeaderRequest)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
