import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { UserStatus } from '../enums/user-status.enum';
import {
  InvalidEmailError,
  InvalidPasswordError,
  UserEmailAlreadyExistsError,
} from '../errors/user-account.errors';
import { PasswordHashService } from './password-hash.service';
import { UserAccountService } from './user-account.service';

describe('UserAccountService', () => {
  let userAccountService: UserAccountService;
  let userRepository: jest.Mocked<Pick<Repository<UserEntity>, 'create' | 'save' | 'findOne'>>;
  let passwordHashService: jest.Mocked<
    Pick<PasswordHashService, 'hash' | 'verify' | 'needsRehash'>
  >;

  beforeEach(async () => {
    userRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    passwordHashService = {
      hash: jest.fn(),
      verify: jest.fn(),
      needsRehash: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserAccountService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepository,
        },
        {
          provide: PasswordHashService,
          useValue: passwordHashService,
        },
      ],
    }).compile();

    userAccountService = moduleRef.get(UserAccountService);
  });

  it('creates an account with normalized email and safe snapshot result', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const savedUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
      passwordHash: '$argon2id$v=19$hash',
      status: UserStatus.Active,
      preferredLocale: null,
      createdAt,
      updatedAt,
    } satisfies UserEntity;

    userRepository.create.mockReturnValue(savedUser);
    userRepository.save.mockResolvedValue(savedUser);
    passwordHashService.hash.mockResolvedValue('$argon2id$v=19$hash');

    const snapshot = await userAccountService.createAccount({
      email: '  Teacher@Parish.Example  ',
      password: 'SecurePassword123!',
    });

    expect(userRepository.create).toHaveBeenCalledWith({
      email: 'teacher@parish.example',
      passwordHash: '$argon2id$v=19$hash',
      status: UserStatus.Active,
      preferredLocale: null,
    });
    expect(snapshot).toEqual({
      id: savedUser.id,
      email: savedUser.email,
      status: UserStatus.Active,
      preferredLocale: null,
      createdAt,
      updatedAt,
    });
    expect(snapshot).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid email addresses during account creation', async () => {
    await expect(
      userAccountService.createAccount({
        email: 'invalid-email',
        password: 'SecurePassword123!',
      }),
    ).rejects.toBeInstanceOf(InvalidEmailError);
  });

  it('rejects passwords that violate the policy during account creation', async () => {
    await expect(
      userAccountService.createAccount({
        email: 'teacher@parish.example',
        password: 'short',
      }),
    ).rejects.toBeInstanceOf(InvalidPasswordError);
  });

  it('maps duplicate email persistence failures to UserEmailAlreadyExistsError', async () => {
    userRepository.create.mockReturnValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
      passwordHash: '$argon2id$v=19$hash',
      status: UserStatus.Active,
      preferredLocale: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserEntity);
    passwordHashService.hash.mockResolvedValue('$argon2id$v=19$hash');
    const duplicateKeyError = new QueryFailedError('INSERT', [], new Error('duplicate key'));
    Object.assign(duplicateKeyError, { driverError: { number: 2627 } });
    userRepository.save.mockRejectedValue(duplicateKeyError);

    await expect(
      userAccountService.createAccount({
        email: 'teacher@parish.example',
        password: 'SecurePassword123!',
      }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);
  });

  it('returns a safe authenticated snapshot when credentials are valid', async () => {
    userRepository.findOne.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
      passwordHash: '$argon2id$v=19$hash',
      status: UserStatus.Active,
      preferredLocale: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserEntity);
    passwordHashService.verify.mockResolvedValue(true);
    passwordHashService.needsRehash.mockReturnValue(false);

    const result = await userAccountService.verifyCredentials(
      '  Teacher@Parish.Example  ',
      'SecurePassword123!',
    );

    expect(result).toEqual({
      valid: true,
      account: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'teacher@parish.example',
        status: UserStatus.Active,
      },
    });
  });

  it('rehashes password hashes that require Argon2 parameter upgrades', async () => {
    const user = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
      passwordHash: '$argon2id$v=19$legacy',
      status: UserStatus.Active,
      preferredLocale: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserEntity;

    userRepository.findOne.mockResolvedValue(user);
    passwordHashService.verify.mockResolvedValue(true);
    passwordHashService.needsRehash.mockReturnValue(true);
    passwordHashService.hash.mockResolvedValue('$argon2id$v=19$upgraded');
    userRepository.save.mockResolvedValue({
      ...user,
      passwordHash: '$argon2id$v=19$upgraded',
    });

    const result = await userAccountService.verifyCredentials(
      'teacher@parish.example',
      'SecurePassword123!',
    );

    expect(result.valid).toBe(true);
    expect(passwordHashService.hash).toHaveBeenCalledWith('SecurePassword123!');
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: '$argon2id$v=19$upgraded' }),
    );
  });

  it('finds account snapshots by normalized email', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');

    userRepository.findOne.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
      passwordHash: '$argon2id$v=19$hash',
      status: UserStatus.Active,
      preferredLocale: null,
      createdAt,
      updatedAt,
    } satisfies UserEntity);

    await expect(
      userAccountService.findAccountSnapshotByEmail('  Teacher@Parish.Example  '),
    ).resolves.toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@parish.example',
      status: UserStatus.Active,
      preferredLocale: null,
      createdAt,
      updatedAt,
    });
  });

  it.each([
    ['unknown email', null, false],
    ['wrong password', UserStatus.Active, false],
    ['inactive account', UserStatus.Inactive, true],
    ['locked account', UserStatus.Locked, true],
  ])(
    'returns generic invalid credentials for %s',
    async (_label, statusOrNull, passwordMatches) => {
      if (statusOrNull === null) {
        userRepository.findOne.mockResolvedValue(null);
        passwordHashService.hash.mockResolvedValue('$argon2id$v=19$dummy');
        passwordHashService.verify.mockResolvedValue(false);
        passwordHashService.needsRehash.mockReturnValue(false);
      } else {
        userRepository.findOne.mockResolvedValue({
          id: '11111111-1111-4111-8111-111111111111',
          email: 'teacher@parish.example',
          passwordHash: '$argon2id$v=19$hash',
          status: statusOrNull,
          preferredLocale: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies UserEntity);
        passwordHashService.verify.mockResolvedValue(passwordMatches);
        passwordHashService.needsRehash.mockReturnValue(false);
      }

      const result = await userAccountService.verifyCredentials(
        'teacher@parish.example',
        'SecurePassword123!',
      );

      expect(result).toEqual({ valid: false });
    },
  );
});
