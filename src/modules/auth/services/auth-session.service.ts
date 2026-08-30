import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { generateUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { INVALID_CREDENTIALS_MESSAGE } from '../config/auth.config.types';
import { AuthSessionEntity } from '../entities/auth-session.entity';
import type {
  CreatedAuthSessionResult,
  RotatedAuthSessionResult,
} from '../interfaces/auth-session-result.interface';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthSessionService {
  constructor(
    @InjectRepository(AuthSessionEntity)
    private readonly authSessionRepository: Repository<AuthSessionEntity>,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async createSession(userId: string): Promise<CreatedAuthSessionResult> {
    const normalizedUserId = normalizeUuid(userId);
    const rawRefreshToken = this.refreshTokenService.generateRefreshToken();
    const refreshTokenHash = this.refreshTokenService.hashRefreshToken(rawRefreshToken);
    const tokenFamilyId = generateUuidV4();
    const expiresAt = this.calculateRefreshExpiresAt();

    const session = this.authSessionRepository.create({
      userId: normalizedUserId,
      refreshTokenHash,
      tokenFamilyId,
      expiresAt,
      revokedAt: null,
    });

    const savedSession = await this.authSessionRepository.save(session);

    return {
      sessionId: normalizeUuid(savedSession.id),
      tokenFamilyId: normalizeUuid(savedSession.tokenFamilyId),
      userId: normalizedUserId,
      rawRefreshToken,
      expiresAt: savedSession.expiresAt,
    };
  }

  async refreshSession(rawRefreshToken: string): Promise<RotatedAuthSessionResult> {
    const refreshTokenHash = this.refreshTokenService.hashRefreshToken(rawRefreshToken);
    const matchingSession = await this.authSessionRepository.findOne({
      where: { refreshTokenHash },
    });

    if (matchingSession === null) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (matchingSession.revokedAt !== null) {
      await this.revokeActiveSessionsInFamily(
        this.authSessionRepository,
        matchingSession.tokenFamilyId,
      );
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (matchingSession.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.authSessionRepository.manager.transaction(async (transactionManager) => {
      const sessionRepository = transactionManager.getRepository(AuthSessionEntity);
      const lockedSession = await sessionRepository.findOne({
        where: { id: normalizeUuid(matchingSession.id) },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        lockedSession === null ||
        lockedSession.revokedAt !== null ||
        lockedSession.expiresAt.getTime() <= Date.now()
      ) {
        if (lockedSession?.revokedAt !== null) {
          await this.revokeActiveSessionsInFamily(
            sessionRepository,
            lockedSession?.tokenFamilyId ?? matchingSession.tokenFamilyId,
          );
        }

        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }

      lockedSession.revokedAt = new Date();
      await sessionRepository.save(lockedSession);

      const nextRawRefreshToken = this.refreshTokenService.generateRefreshToken();
      const nextRefreshTokenHash = this.refreshTokenService.hashRefreshToken(nextRawRefreshToken);
      const nextExpiresAt = this.calculateRefreshExpiresAt();

      const nextSession = sessionRepository.create({
        userId: normalizeUuid(lockedSession.userId),
        refreshTokenHash: nextRefreshTokenHash,
        tokenFamilyId: normalizeUuid(lockedSession.tokenFamilyId),
        expiresAt: nextExpiresAt,
        revokedAt: null,
      });

      const savedNextSession = await sessionRepository.save(nextSession);

      return {
        sessionId: normalizeUuid(savedNextSession.id),
        tokenFamilyId: normalizeUuid(savedNextSession.tokenFamilyId),
        userId: normalizeUuid(savedNextSession.userId),
        rawRefreshToken: nextRawRefreshToken,
        expiresAt: savedNextSession.expiresAt,
      };
    });
  }

  async revokeTokenFamilyBySessionId(sessionId: string): Promise<void> {
    const normalizedSessionId = normalizeUuid(sessionId);
    const session = await this.authSessionRepository.findOne({
      where: { id: normalizedSessionId },
    });

    if (session === null) {
      return;
    }

    await this.revokeActiveSessionsInFamily(
      this.authSessionRepository,
      session.tokenFamilyId,
    );
  }

  private async revokeActiveSessionsInFamily(
    repository: Repository<AuthSessionEntity>,
    tokenFamilyId: string,
  ): Promise<void> {
    await repository.update(
      {
        tokenFamilyId: normalizeUuid(tokenFamilyId),
        revokedAt: IsNull(),
      },
      {
        revokedAt: new Date(),
      },
    );
  }

  private calculateRefreshExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setUTCSeconds(
      expiresAt.getUTCSeconds() + this.refreshTokenService.getRefreshTokenExpiresInSeconds(),
    );

    return expiresAt;
  }
}
