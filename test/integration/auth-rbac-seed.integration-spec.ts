import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { AuthRbacSeedModule } from '../../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../../src/database/seeds/auth-rbac.seed.service';
import {
  AUTH_RBAC_SAMPLE_DOMAIN,
  AUTH_RBAC_SEED_PERMISSIONS,
  AUTH_RBAC_SEED_ROLES,
  AUTH_RBAC_SEED_USERS,
} from '../../src/database/seeds/auth-rbac.seed.constants';
import {
  assertSafeSeedEnvironment,
  UnsafeSeedEnvironmentError,
} from '../../src/database/seeds/seed-environment.guard';
import { AccessControlService } from '../../src/modules/access-control/services/access-control.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';

const SEED_ROLE_CODES = AUTH_RBAC_SEED_ROLES.map((role) => `'${role.code}'`).join(', ');
const SEED_PERMISSION_CODES = AUTH_RBAC_SEED_PERMISSIONS.map(
  (permission) => `'${permission.code}'`,
).join(', ');

describe('AuthRbacSeedService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let seedService: AuthRbacSeedService;
  let userAccountService: UserAccountService;
  let accessControlService: AccessControlService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [AuthRbacSeedModule],
    }).compile();

    seedService = moduleRef.get(AuthRbacSeedService);
    userAccountService = moduleRef.get(UserAccountService);
    accessControlService = moduleRef.get(AccessControlService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE code IN (${SEED_ROLE_CODES}))
    `);
    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}')
    `);
    await AppDataSource.query(`
      DELETE FROM permissions
      WHERE code IN (${SEED_PERMISSION_CODES})
    `);
    await AppDataSource.query(`
      DELETE FROM roles
      WHERE code IN (${SEED_ROLE_CODES})
    `);
    await AppDataSource.query(`
      DELETE FROM users
      WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates sample roles, permissions, users, and assignments on first run', async () => {
    const summary = await seedService.run();

    expect(summary.permissionsCreated).toBe(AUTH_RBAC_SEED_PERMISSIONS.length);
    expect(summary.rolesCreated).toBe(AUTH_RBAC_SEED_ROLES.length);
    expect(summary.usersCreated).toBe(AUTH_RBAC_SEED_USERS.length);

    for (const seedUser of AUTH_RBAC_SEED_USERS) {
      const account = await userAccountService.findAccountSnapshotByEmail(seedUser.email);

      if (account === null) {
        throw new Error(`Expected seeded account for ${seedUser.email}.`);
      }

      const roles = await accessControlService.getRolesForUser(account.id);
      expect(roles.map((role) => role.code)).toContain(seedUser.roleCode);
    }
  });

  it('remains idempotent on second run without duplicating records', async () => {
    const firstRun = await seedService.run();
    const secondRun = await seedService.run();

    expect(firstRun.usersCreated).toBe(AUTH_RBAC_SEED_USERS.length);
    expect(secondRun.usersCreated).toBe(0);
    expect(secondRun.usersExisting).toBe(AUTH_RBAC_SEED_USERS.length);
    expect(secondRun.permissionsExisting).toBe(AUTH_RBAC_SEED_PERMISSIONS.length);
    expect(secondRun.rolesExisting).toBe(AUTH_RBAC_SEED_ROLES.length);

    const userCountRows: Array<{ count: number }> = await AppDataSource.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
    `);

    expect(Number(userCountRows[0]?.count ?? 0)).toBe(AUTH_RBAC_SEED_USERS.length);
  });

  it('rejects unsafe production seed environments', () => {
    expect(() => {
      assertSafeSeedEnvironment({
        NODE_ENV: 'production',
        DB_NAME: 'catechism_api_test',
      });
    }).toThrow(UnsafeSeedEnvironmentError);
  });
});
