import { normalizeUuid } from '../../../database/uuid-v4.util';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { parseLocale } from '../../../common/locale';
import { UserEntity } from '../entities/user.entity';
import { UserStatus } from '../enums/user-status.enum';
import {
  InvalidEmailError,
  InvalidPasswordError,
  InvalidPreferredLocaleError,
  UserAccountNotFoundError,
  UserEmailAlreadyExistsError,
} from '../errors/user-account.errors';
import type { CreateAccountInput } from '../interfaces/create-account-input.interface';
import type { UserAccountSnapshot } from '../interfaces/user-account-snapshot.interface';
import {
  INVALID_CREDENTIALS_RESULT,
  type VerifyCredentialsResult,
} from '../interfaces/verify-credentials-result.interface';
import {
  toAuthenticatedAccountSnapshot,
  toUserAccountSnapshot,
} from '../mappers/user-account.mapper';
import { PasswordHashService } from './password-hash.service';
import { isValidEmail, normalizeEmail } from '../utils/email-normalizer';
import { PASSWORD_POLICY_MESSAGES, validatePasswordPolicy } from '../utils/password-policy';

const TIMING_DUMMY_PASSWORD = '__catechism_timing_dummy_password__';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class UserAccountService {
  private timingDummyHashPromise: Promise<string> | null = null;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  async createAccount(input: CreateAccountInput): Promise<UserAccountSnapshot> {
    const normalizedEmail = normalizeEmail(input.email);

    if (!isValidEmail(normalizedEmail)) {
      throw new InvalidEmailError();
    }

    try {
      validatePasswordPolicy(input.password);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : PASSWORD_POLICY_MESSAGES.tooShort;
      throw new InvalidPasswordError(message);
    }

    const user = this.userRepository.create({
      email: normalizedEmail,
      passwordHash: await this.passwordHashService.hash(input.password),
      status: input.status ?? UserStatus.Active,
      preferredLocale: null,
    });

    try {
      const savedUser = await this.userRepository.save(user);

      return toUserAccountSnapshot(savedUser);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new UserEmailAlreadyExistsError(normalizedEmail);
      }

      throw error;
    }
  }

  async verifyCredentials(email: string, password: string): Promise<VerifyCredentialsResult> {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      await this.runTimingSafePasswordCheck(password);

      return INVALID_CREDENTIALS_RESULT;
    }

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (user === null) {
      await this.runTimingSafePasswordCheck(password);

      return INVALID_CREDENTIALS_RESULT;
    }

    const passwordMatches = await this.passwordHashService.verify(password, user.passwordHash);

    if (!passwordMatches || user.status !== UserStatus.Active) {
      return INVALID_CREDENTIALS_RESULT;
    }

    if (this.passwordHashService.needsRehash(user.passwordHash)) {
      try {
        user.passwordHash = await this.passwordHashService.hash(password);
        await this.userRepository.save(user);
      } catch {
        // Password rehash upgrades must not block successful authentication.
      }
    }

    return {
      valid: true,
      account: toAuthenticatedAccountSnapshot(user),
    };
  }

  async getAccountSnapshotById(userId: string): Promise<UserAccountSnapshot | null> {
    const user = await this.userRepository.findOne({
      where: { id: normalizeUuid(userId) },
    });

    if (user === null) {
      return null;
    }

    return toUserAccountSnapshot(user);
  }

  async findAccountSnapshotByEmail(email: string): Promise<UserAccountSnapshot | null> {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (user === null) {
      return null;
    }

    return toUserAccountSnapshot(user);
  }

  async isAccountEligibleForAuthentication(userId: string): Promise<boolean> {
    const accountSnapshot = await this.getAccountSnapshotById(userId);

    return accountSnapshot !== null && accountSnapshot.status === UserStatus.Active;
  }

  async updatePreferredLocale(
    userId: string,
    preferredLocale: string | null,
  ): Promise<UserAccountSnapshot> {
    const normalizedUserId = normalizeUuid(userId);
    const user = await this.userRepository.findOne({
      where: { id: normalizedUserId },
    });

    if (user === null) {
      throw new UserAccountNotFoundError();
    }

    if (preferredLocale === null) {
      user.preferredLocale = null;
    } else {
      try {
        user.preferredLocale = parseLocale(preferredLocale);
      } catch {
        throw new InvalidPreferredLocaleError();
      }
    }

    const savedUser = await this.userRepository.save(user);

    return toUserAccountSnapshot(savedUser);
  }

  async listActiveUserIds(options: { skip: number; take: number }): Promise<string[]> {
    const rows = await this.userRepository.find({
      where: { status: UserStatus.Active },
      select: ['id'],
      order: { id: 'ASC' },
      skip: Math.max(0, options.skip),
      take: Math.max(1, options.take),
    });

    return rows.map((row) => normalizeUuid(row.id));
  }

  async countActiveUsers(): Promise<number> {
    return this.userRepository.count({
      where: { status: UserStatus.Active },
    });
  }

  private async runTimingSafePasswordCheck(password: string): Promise<void> {
    const dummyHash = await this.getTimingDummyHash();

    try {
      await this.passwordHashService.verify(password, dummyHash);
    } catch {
      // Argon2 verify failures are expected for mismatched passwords.
    }
  }

  private async getTimingDummyHash(): Promise<string> {
    if (this.timingDummyHashPromise === null) {
      this.timingDummyHashPromise = this.passwordHashService.hash(TIMING_DUMMY_PASSWORD);
    }

    return this.timingDummyHashPromise;
  }
}
