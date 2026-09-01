import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserAccountService } from '../../users/services/user-account.service';
import { INVALID_CREDENTIALS_MESSAGE, JWT_ACCESS_TOKEN_TYPE } from '../config/auth.config.types';
import type {
  AuthenticatedLoginResult,
  AuthenticatedRefreshResult,
} from '../interfaces/authenticated-auth-result.interface';
import { AccessTokenService } from './access-token.service';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userAccountService: UserAccountService,
    private readonly accessTokenService: AccessTokenService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async login(email: string, password: string): Promise<AuthenticatedLoginResult> {
    const verificationResult = await this.userAccountService.verifyCredentials(email, password);

    if (!verificationResult.valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const createdSession = await this.authSessionService.createSession(
      verificationResult.account.id,
    );
    const accessToken = await this.accessTokenService.signAccessToken(
      verificationResult.account.id,
      createdSession.sessionId,
    );

    return {
      loginResponse: {
        accessToken,
        tokenType: JWT_ACCESS_TOKEN_TYPE,
        expiresIn: this.accessTokenService.getAccessTokenExpiresInSeconds(),
        user: {
          id: verificationResult.account.id,
          email: verificationResult.account.email,
        },
      },
      rawRefreshToken: createdSession.rawRefreshToken,
    };
  }

  async refreshAccessToken(rawRefreshToken: string): Promise<AuthenticatedRefreshResult> {
    const rotatedSession = await this.authSessionService.refreshSession(rawRefreshToken);
    const accountEligible = await this.userAccountService.isAccountEligibleForAuthentication(
      rotatedSession.userId,
    );

    if (!accountEligible) {
      await this.authSessionService.revokeTokenFamilyBySessionId(rotatedSession.sessionId);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const accessToken = await this.accessTokenService.signAccessToken(
      rotatedSession.userId,
      rotatedSession.sessionId,
    );

    return {
      accessTokenResponse: {
        accessToken,
        tokenType: JWT_ACCESS_TOKEN_TYPE,
        expiresIn: this.accessTokenService.getAccessTokenExpiresInSeconds(),
      },
      rawRefreshToken: rotatedSession.rawRefreshToken,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.authSessionService.revokeTokenFamilyBySessionId(sessionId);
  }

  async getAuthenticatedProfile(userId: string): Promise<{
    id: string;
    email: string;
    preferredLocale: string | null;
  }> {
    const accountSnapshot = await this.userAccountService.getAccountSnapshotById(userId);

    if (accountSnapshot === null) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      id: accountSnapshot.id,
      email: accountSnapshot.email,
      preferredLocale: accountSnapshot.preferredLocale,
    };
  }
}
