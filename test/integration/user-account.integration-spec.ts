import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { isUuidV4 } from '../../src/database/uuid-v4.util';
import { UserStatus } from '../../src/modules/users/enums/user-status.enum';
import { UserEmailAlreadyExistsError } from '../../src/modules/users/errors/user-account.errors';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';

const TEST_EMAIL_PREFIX = 'auth003-integration-';
const TEST_PASSWORD = 'SecurePassword123!';

describe('UserAccountService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let userAccountService: UserAccountService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ApplicationConfigModule, DatabaseModule, UsersModule],
    }).compile();

    userAccountService = moduleRef.get(UserAccountService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM users
      WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  function buildTestEmail(localPart: string): string {
    return `${TEST_EMAIL_PREFIX}${localPart}@example.com`;
  }

  it('creates an account with normalized email, Argon2 hash, and safe snapshot', async () => {
    const snapshot = await userAccountService.createAccount({
      email: `  ${buildTestEmail('create-success')}  `.toUpperCase(),
      password: TEST_PASSWORD,
    });

    expect(snapshot.email).toBe(buildTestEmail('create-success'));
    expect(snapshot.status).toBe(UserStatus.Active);
    expect(isUuidV4(snapshot.id)).toBe(true);
    expect(snapshot).not.toHaveProperty('passwordHash');

    const persistedRows = await AppDataSource.query<
      Array<{ email: string; password_hash: string; status: string }>
    >(`SELECT email, password_hash, status FROM users WHERE email = @0`, [snapshot.email]);

    expect(persistedRows[0]?.email).toBe(buildTestEmail('create-success'));
    expect(persistedRows[0]?.password_hash.startsWith('$argon2id$')).toBe(true);
    expect(persistedRows[0]?.password_hash).not.toBe(TEST_PASSWORD);
    expect(persistedRows[0]?.status).toBe(UserStatus.Active);
  });

  it('rejects duplicate emails after normalization', async () => {
    const rawEmail = `  ${buildTestEmail('duplicate')}  `.toUpperCase();

    await userAccountService.createAccount({
      email: rawEmail,
      password: TEST_PASSWORD,
    });

    await expect(
      userAccountService.createAccount({
        email: rawEmail.toLowerCase(),
        password: TEST_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);
  });

  it('verifies valid credentials and returns a safe authenticated snapshot', async () => {
    const email = buildTestEmail('verify-success');

    await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    const result = await userAccountService.verifyCredentials(email, TEST_PASSWORD);

    expect(result.valid).toBe(true);

    if (result.valid) {
      expect(result.account.email).toBe(email);
      expect(result.account.status).toBe(UserStatus.Active);
      expect(isUuidV4(result.account.id)).toBe(true);
    }
  });

  it('returns generic invalid credentials for a wrong password', async () => {
    const email = buildTestEmail('wrong-password');

    await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    const result = await userAccountService.verifyCredentials(email, 'WrongPassword999!');

    expect(result).toEqual({ valid: false });
  });

  it('returns generic invalid credentials for an unknown email', async () => {
    const result = await userAccountService.verifyCredentials(
      buildTestEmail('missing-account'),
      TEST_PASSWORD,
    );

    expect(result).toEqual({ valid: false });
  });

  it('returns generic invalid credentials for inactive and locked accounts', async () => {
    const inactiveEmail = buildTestEmail('inactive');
    const lockedEmail = buildTestEmail('locked');

    await userAccountService.createAccount({
      email: inactiveEmail,
      password: TEST_PASSWORD,
      status: UserStatus.Inactive,
    });

    await userAccountService.createAccount({
      email: lockedEmail,
      password: TEST_PASSWORD,
      status: UserStatus.Locked,
    });

    await expect(
      userAccountService.verifyCredentials(inactiveEmail, TEST_PASSWORD),
    ).resolves.toEqual({
      valid: false,
    });
    await expect(userAccountService.verifyCredentials(lockedEmail, TEST_PASSWORD)).resolves.toEqual(
      {
        valid: false,
      },
    );
  });
});
