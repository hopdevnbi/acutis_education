import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import authConfiguration from '../config/auth.configuration';
import { AUTH_CONFIGURATION_NAMESPACE, type AuthConfiguration } from '../config/auth.config.types';
import { AccessTokenService } from './access-token.service';

describe('AccessTokenService', () => {
  let accessTokenService: AccessTokenService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [authConfiguration],
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule.forFeature(authConfiguration)],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const authConfigurationValue = configService.get<AuthConfiguration>(
              AUTH_CONFIGURATION_NAMESPACE,
            );

            if (authConfigurationValue === undefined) {
              throw new Error('Auth configuration is not available.');
            }

            return {
              secret: authConfigurationValue.accessSecret,
              signOptions: {
                algorithm: 'HS256',
                expiresIn: authConfigurationValue.accessExpiresInSeconds,
              },
            };
          },
        }),
      ],
      providers: [AccessTokenService],
    }).compile();

    accessTokenService = moduleRef.get(AccessTokenService);
  });

  it('signs and verifies access tokens with sub and sid claims', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const sessionId = '22222222-2222-4222-8222-222222222222';
    const accessToken = await accessTokenService.signAccessToken(userId, sessionId);
    const authenticatedUser = await accessTokenService.verifyAccessToken(accessToken);

    expect(authenticatedUser).toEqual({ userId, sessionId });
  });

  it('rejects tokens without sid claim', async () => {
    const { JwtService } = await import('@nestjs/jwt');
    const jwtService = moduleRef.get(JwtService);
    const legacyToken = await jwtService.signAsync({
      sub: '11111111-1111-4111-8111-111111111111',
    });

    await expect(accessTokenService.verifyAccessToken(legacyToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects malformed and tampered tokens', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const sessionId = '22222222-2222-4222-8222-222222222222';
    const accessToken = await accessTokenService.signAccessToken(userId, sessionId);
    const tamperedToken = `${accessToken}x`;

    await expect(accessTokenService.verifyAccessToken('not-a-jwt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(accessTokenService.verifyAccessToken(tamperedToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('exposes configured access token expiration seconds', () => {
    expect(accessTokenService.getAccessTokenExpiresInSeconds()).toBe(900);
  });
});
