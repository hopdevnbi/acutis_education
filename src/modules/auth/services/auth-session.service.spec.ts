import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import { AuthSessionEntity } from '../entities/auth-session.entity';
import { RefreshTokenService } from './refresh-token.service';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let authSessionService: AuthSessionService;
  let authSessionRepository: jest.Mocked<
    Pick<Repository<AuthSessionEntity>, 'create' | 'save' | 'findOne' | 'update' | 'manager'>
  >;
  let refreshTokenService: jest.Mocked<
    Pick<
      RefreshTokenService,
      'generateRefreshToken' | 'hashRefreshToken' | 'getRefreshTokenExpiresInSeconds'
    >
  >;

  beforeEach(async () => {
    authSessionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      manager: {
        transaction: jest.fn(),
      } as unknown as Repository<AuthSessionEntity>['manager'],
    };

    refreshTokenService = {
      generateRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn(),
      getRefreshTokenExpiresInSeconds: jest.fn().mockReturnValue(604800),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        {
          provide: getRepositoryToken(AuthSessionEntity),
          useValue: authSessionRepository,
        },
        {
          provide: RefreshTokenService,
          useValue: refreshTokenService,
        },
      ],
    }).compile();

    authSessionService = moduleRef.get(AuthSessionService);
  });

  it('creates a session with hashed refresh token metadata', async () => {
    refreshTokenService.generateRefreshToken.mockReturnValue('raw-refresh-token');
    refreshTokenService.hashRefreshToken.mockReturnValue('hashed-refresh-token');
    authSessionRepository.create.mockImplementation((value) => value as AuthSessionEntity);
    authSessionRepository.save.mockImplementation((value) =>
      Promise.resolve({
        ...(value as AuthSessionEntity),
        id: '33333333-3333-4333-8333-333333333333',
      }),
    );

    const createdSession = await authSessionService.createSession(
      '11111111-1111-4111-8111-111111111111',
    );

    expect(createdSession.rawRefreshToken).toBe('raw-refresh-token');
    expect(createdSession.sessionId).toBe('33333333-3333-4333-8333-333333333333');
    expect(authSessionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '11111111-1111-4111-8111-111111111111',
        refreshTokenHash: 'hashed-refresh-token',
        revokedAt: null,
      }),
    );
  });

  it('revokes the token family by session id', async () => {
    authSessionRepository.findOne.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      tokenFamilyId: '44444444-4444-4444-8444-444444444444',
    } as AuthSessionEntity);

    await authSessionService.revokeTokenFamilyBySessionId('33333333-3333-4333-8333-333333333333');

    expect(authSessionRepository.update).toHaveBeenCalledWith(
      {
        tokenFamilyId: '44444444-4444-4444-8444-444444444444',
        revokedAt: IsNull(),
      },
      expect.objectContaining({
        revokedAt: expect.any(Date) as Date,
      }),
    );
  });

  it('rejects refresh when the token hash is unknown', async () => {
    refreshTokenService.hashRefreshToken.mockReturnValue('missing-hash');
    authSessionRepository.findOne.mockResolvedValue(null);

    await expect(authSessionService.refreshSession('unknown-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
