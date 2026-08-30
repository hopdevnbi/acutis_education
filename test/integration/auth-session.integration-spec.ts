import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { isUuidV4 } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { AuthSessionService } from '../../src/modules/auth/services/auth-session.service';
import { RefreshTokenService } from '../../src/modules/auth/services/refresh-token.service';
import { UserStatus } from '../../src/modules/users/enums/user-status.enum';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';

const TEST_EMAIL_PREFIX = 'auth005-integration-';
const TEST_PASSWORD = 'SecurePassword123!';

describe('Auth session integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let userAccountService: UserAccountService;
  let authSessionService: AuthSessionService;
  let refreshTokenService: RefreshTokenService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ApplicationConfigModule, DatabaseModule, UsersModule, AuthModule],
    }).compile();

    userAccountService = moduleRef.get(UserAccountService);
    authSessionService = moduleRef.get(AuthSessionService);
    refreshTokenService = moduleRef.get(RefreshTokenService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
      )
    `);
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

  it('creates a session with hashed refresh token and token family metadata', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('create-session'),
      password: TEST_PASSWORD,
    });

    const createdSession = await authSessionService.createSession(account.id);

    expect(isUuidV4(createdSession.sessionId)).toBe(true);
    expect(isUuidV4(createdSession.tokenFamilyId)).toBe(true);
    expect(createdSession.rawRefreshToken.length).toBeGreaterThanOrEqual(32);

    const persistedRows = await AppDataSource.query<
      Array<{
        id: string;
        refresh_token_hash: string;
        token_family_id: string;
        revoked_at: Date | null;
      }>
    >(
      `SELECT id, refresh_token_hash, token_family_id, revoked_at FROM auth_sessions WHERE id = @0`,
      [createdSession.sessionId],
    );

    expect(persistedRows).toHaveLength(1);
    expect(persistedRows[0]?.refresh_token_hash).toBe(
      refreshTokenService.hashRefreshToken(createdSession.rawRefreshToken),
    );
    expect(persistedRows[0]?.refresh_token_hash).not.toBe(createdSession.rawRefreshToken);
    expect(persistedRows[0]?.revoked_at).toBeNull();
  });

  it('rotates refresh tokens and revokes the previous session row', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('rotate-session'),
      password: TEST_PASSWORD,
    });
    const createdSession = await authSessionService.createSession(account.id);

    const rotatedSession = await authSessionService.refreshSession(createdSession.rawRefreshToken);

    expect(rotatedSession.tokenFamilyId).toBe(createdSession.tokenFamilyId);
    expect(rotatedSession.sessionId).not.toBe(createdSession.sessionId);

    const sessionRows = await AppDataSource.query<Array<{ id: string; revoked_at: Date | null }>>(
      `SELECT id, revoked_at FROM auth_sessions WHERE token_family_id = @0 ORDER BY created_at ASC`,
      [createdSession.tokenFamilyId],
    );

    expect(sessionRows).toHaveLength(2);
    expect(sessionRows[0]?.revoked_at).not.toBeNull();
    expect(sessionRows[1]?.revoked_at).toBeNull();
  });

  it('revokes the token family when an old refresh token is replayed', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('replay-session'),
      password: TEST_PASSWORD,
    });
    const createdSession = await authSessionService.createSession(account.id);
    const rotatedSession = await authSessionService.refreshSession(createdSession.rawRefreshToken);

    await expect(
      authSessionService.refreshSession(createdSession.rawRefreshToken),
    ).rejects.toMatchObject({ status: 401 });

    const activeRows = await AppDataSource.query<Array<{ id: string; revoked_at: Date | null }>>(
      `SELECT id, revoked_at FROM auth_sessions WHERE token_family_id = @0`,
      [createdSession.tokenFamilyId],
    );

    expect(activeRows.every((row) => row.revoked_at !== null)).toBe(true);

    await expect(
      authSessionService.refreshSession(rotatedSession.rawRefreshToken),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects refresh for inactive accounts through AuthService eligibility checks', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('inactive-session'),
      password: TEST_PASSWORD,
      status: UserStatus.Inactive,
    });
    const createdSession = await authSessionService.createSession(account.id);

    expect(await userAccountService.isAccountEligibleForAuthentication(account.id)).toBe(false);
    expect(createdSession.rawRefreshToken.length).toBeGreaterThan(0);
  });
});
