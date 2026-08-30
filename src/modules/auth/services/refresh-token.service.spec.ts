import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import authConfiguration from '../config/auth.configuration';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  let refreshTokenService: RefreshTokenService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [authConfiguration],
        }),
      ],
      providers: [RefreshTokenService],
    }).compile();

    refreshTokenService = moduleRef.get(RefreshTokenService);
  });

  it('generates high-entropy URL-safe refresh tokens', () => {
    const firstToken = refreshTokenService.generateRefreshToken();
    const secondToken = refreshTokenService.generateRefreshToken();

    expect(firstToken.length).toBeGreaterThanOrEqual(32);
    expect(secondToken.length).toBeGreaterThanOrEqual(32);
    expect(firstToken).not.toBe(secondToken);
  });

  it('hashes refresh tokens deterministically with the configured secret', () => {
    const rawToken = refreshTokenService.generateRefreshToken();
    const firstHash = refreshTokenService.hashRefreshToken(rawToken);
    const secondHash = refreshTokenService.hashRefreshToken(rawToken);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(rawToken);
  });

  it('produces different hashes for different refresh tokens', () => {
    const firstHash = refreshTokenService.hashRefreshToken(
      refreshTokenService.generateRefreshToken(),
    );
    const secondHash = refreshTokenService.hashRefreshToken(
      refreshTokenService.generateRefreshToken(),
    );

    expect(firstHash).not.toBe(secondHash);
  });

  it('exposes configured refresh token expiration seconds', () => {
    expect(refreshTokenService.getRefreshTokenExpiresInSeconds()).toBe(604800);
  });
});
