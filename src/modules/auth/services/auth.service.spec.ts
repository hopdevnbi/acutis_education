import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UserAccountService } from '../../users/services/user-account.service';
import { JWT_ACCESS_TOKEN_TYPE } from '../config/auth.config.types';
import { AccessTokenService } from './access-token.service';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userAccountService: jest.Mocked<
    Pick<
      UserAccountService,
      'verifyCredentials' | 'getAccountSnapshotById' | 'isAccountEligibleForAuthentication'
    >
  >;
  let accessTokenService: jest.Mocked<
    Pick<AccessTokenService, 'signAccessToken' | 'getAccessTokenExpiresInSeconds'>
  >;
  let authSessionService: jest.Mocked<
    Pick<AuthSessionService, 'createSession' | 'refreshSession' | 'revokeTokenFamilyBySessionId'>
  >;

  beforeEach(async () => {
    userAccountService = {
      verifyCredentials: jest.fn(),
      getAccountSnapshotById: jest.fn(),
      isAccountEligibleForAuthentication: jest.fn(),
    };

    accessTokenService = {
      signAccessToken: jest.fn(),
      getAccessTokenExpiresInSeconds: jest.fn(),
    };

    authSessionService = {
      createSession: jest.fn(),
      refreshSession: jest.fn(),
      revokeTokenFamilyBySessionId: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserAccountService,
          useValue: userAccountService,
        },
        {
          provide: AccessTokenService,
          useValue: accessTokenService,
        },
        {
          provide: AuthSessionService,
          useValue: authSessionService,
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it('returns login response and raw refresh token after creating a session', async () => {
    userAccountService.verifyCredentials.mockResolvedValue({
      valid: true,
      account: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'teacher@parish.example',
        status: UserStatus.Active,
      },
    });
    authSessionService.createSession.mockResolvedValue({
      sessionId: '22222222-2222-4222-8222-222222222222',
      tokenFamilyId: '33333333-3333-4333-8333-333333333333',
      userId: '11111111-1111-4111-8111-111111111111',
      rawRefreshToken: 'raw-refresh-token',
      expiresAt: new Date(),
    });
    accessTokenService.signAccessToken.mockResolvedValue('signed-access-token');
    accessTokenService.getAccessTokenExpiresInSeconds.mockReturnValue(900);

    const loginResult = await authService.login('teacher@parish.example', 'SecurePassword123!');

    expect(loginResult).toEqual({
      loginResponse: {
        accessToken: 'signed-access-token',
        tokenType: JWT_ACCESS_TOKEN_TYPE,
        expiresIn: 900,
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'teacher@parish.example',
        },
      },
      rawRefreshToken: 'raw-refresh-token',
    });
    expect(accessTokenService.signAccessToken).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('throws UnauthorizedException for invalid credentials', async () => {
    userAccountService.verifyCredentials.mockResolvedValue({ valid: false });

    await expect(
      authService.login('teacher@parish.example', 'WrongPassword999!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates refresh tokens and returns a new access token', async () => {
    authSessionService.refreshSession.mockResolvedValue({
      sessionId: '44444444-4444-4444-8444-444444444444',
      tokenFamilyId: '33333333-3333-4333-8333-333333333333',
      userId: '11111111-1111-4111-8111-111111111111',
      rawRefreshToken: 'next-refresh-token',
      expiresAt: new Date(),
    });
    userAccountService.isAccountEligibleForAuthentication.mockResolvedValue(true);
    accessTokenService.signAccessToken.mockResolvedValue('next-access-token');
    accessTokenService.getAccessTokenExpiresInSeconds.mockReturnValue(900);

    const refreshResult = await authService.refreshAccessToken('raw-refresh-token');

    expect(refreshResult).toEqual({
      accessTokenResponse: {
        accessToken: 'next-access-token',
        tokenType: JWT_ACCESS_TOKEN_TYPE,
        expiresIn: 900,
      },
      rawRefreshToken: 'next-refresh-token',
    });
  });

  it('revokes the token family when refresh targets an ineligible account', async () => {
    authSessionService.refreshSession.mockResolvedValue({
      sessionId: '44444444-4444-4444-8444-444444444444',
      tokenFamilyId: '33333333-3333-4333-8333-333333333333',
      userId: '11111111-1111-4111-8111-111111111111',
      rawRefreshToken: 'next-refresh-token',
      expiresAt: new Date(),
    });
    userAccountService.isAccountEligibleForAuthentication.mockResolvedValue(false);

    await expect(authService.refreshAccessToken('raw-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authSessionService.revokeTokenFamilyBySessionId).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    );
  });

  it('returns a safe authenticated profile through UserAccountService', async () => {
    userAccountService.getAccountSnapshotById.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
      status: UserStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.getAuthenticatedProfile('11111111-1111-4111-8111-111111111111'),
    ).resolves.toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
    });
  });
});
