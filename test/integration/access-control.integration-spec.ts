import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { AccessControlModule } from '../../src/modules/access-control/access-control.module';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
  RoleNotFoundError,
  UserNotFoundForRoleAssignmentError,
} from '../../src/modules/access-control/errors/access-control.errors';
import { AccessControlService } from '../../src/modules/access-control/services/access-control.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';

const TEST_EMAIL_PREFIX = 'auth006-integration-';
const TEST_PASSWORD = 'SecurePassword123!';
const TEST_ROLE_CODE = 'AUTH006_CATECHIST';
const TEST_ROLE_CODE_2 = 'AUTH006_COORDINATOR';
const TEST_PERMISSION_READ = 'auth006.classes.read';
const TEST_PERMISSION_MANAGE = 'auth006.classes.manage';

describe('AccessControlService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let accessControlService: AccessControlService;
  let userAccountService: UserAccountService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ApplicationConfigModule, DatabaseModule, UsersModule, AccessControlModule],
    }).compile();

    accessControlService = moduleRef.get(AccessControlService);
    userAccountService = moduleRef.get(UserAccountService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE code LIKE 'AUTH006_%')
    `);
    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%')
    `);
    await AppDataSource.query(`
      DELETE FROM permissions
      WHERE code LIKE 'auth006.%'
    `);
    await AppDataSource.query(`
      DELETE FROM roles
      WHERE code LIKE 'AUTH006_%'
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

  it('creates roles and permissions with normalized codes', async () => {
    const role = await accessControlService.createRole({
      code: ' auth006_catechist ',
      name: 'Catechist',
    });
    const permission = await accessControlService.createPermission({
      code: ' Auth006.Classes.Read ',
      name: 'Read classes',
    });

    expect(role.code).toBe(TEST_ROLE_CODE);
    expect(permission.code).toBe(TEST_PERMISSION_READ);
  });

  it('maps duplicate role and permission codes to module errors', async () => {
    await accessControlService.createRole({
      code: TEST_ROLE_CODE,
      name: 'Catechist',
    });
    await accessControlService.createPermission({
      code: TEST_PERMISSION_READ,
      name: 'Read classes',
    });

    await expect(
      accessControlService.createRole({
        code: TEST_ROLE_CODE,
        name: 'Duplicate role',
      }),
    ).rejects.toBeInstanceOf(RoleCodeAlreadyExistsError);

    await expect(
      accessControlService.createPermission({
        code: TEST_PERMISSION_READ,
        name: 'Duplicate permission',
      }),
    ).rejects.toBeInstanceOf(PermissionCodeAlreadyExistsError);
  });

  it('assigns roles and permissions idempotently and resolves effective permissions', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('effective-permissions'),
      password: TEST_PASSWORD,
    });

    await accessControlService.createRole({ code: TEST_ROLE_CODE, name: 'Catechist' });
    await accessControlService.createRole({ code: TEST_ROLE_CODE_2, name: 'Coordinator' });
    await accessControlService.createPermission({
      code: TEST_PERMISSION_READ,
      name: 'Read classes',
    });
    await accessControlService.createPermission({
      code: TEST_PERMISSION_MANAGE,
      name: 'Manage classes',
    });

    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE_2);
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, TEST_PERMISSION_READ);
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE_2, TEST_PERMISSION_READ);
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE_2, TEST_PERMISSION_MANAGE);

    expect(await accessControlService.getEffectivePermissions(account.id)).toEqual([
      TEST_PERMISSION_MANAGE,
      TEST_PERMISSION_READ,
    ]);
    expect(await accessControlService.userHasPermission(account.id, TEST_PERMISSION_MANAGE)).toBe(
      true,
    );
    expect(await accessControlService.userHasPermission(account.id, 'auth006.users.read')).toBe(
      false,
    );
  });

  it('updates effective permissions immediately after assignment removal', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('remove-permission'),
      password: TEST_PASSWORD,
    });

    await accessControlService.createRole({ code: TEST_ROLE_CODE, name: 'Catechist' });
    await accessControlService.createPermission({
      code: TEST_PERMISSION_READ,
      name: 'Read classes',
    });
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    await accessControlService.assignPermissionToRole(TEST_ROLE_CODE, TEST_PERMISSION_READ);

    expect(await accessControlService.userHasPermission(account.id, TEST_PERMISSION_READ)).toBe(
      true,
    );

    await accessControlService.removePermissionFromRole(TEST_ROLE_CODE, TEST_PERMISSION_READ);

    expect(await accessControlService.userHasPermission(account.id, TEST_PERMISSION_READ)).toBe(
      false,
    );
  });

  it('removes role assignments idempotently', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('remove-role'),
      password: TEST_PASSWORD,
    });

    await accessControlService.createRole({ code: TEST_ROLE_CODE, name: 'Catechist' });
    await accessControlService.assignRoleToUser(account.id, TEST_ROLE_CODE);
    await accessControlService.removeRoleFromUser(account.id, TEST_ROLE_CODE);
    await accessControlService.removeRoleFromUser(account.id, TEST_ROLE_CODE);

    expect(await accessControlService.getRolesForUser(account.id)).toEqual([]);
  });

  it('maps missing users on role assignment through FK violations', async () => {
    await accessControlService.createRole({ code: TEST_ROLE_CODE, name: 'Catechist' });

    await expect(
      accessControlService.assignRoleToUser('11111111-1111-4111-8111-111111111111', TEST_ROLE_CODE),
    ).rejects.toBeInstanceOf(UserNotFoundForRoleAssignmentError);
  });

  it('throws when assigning a missing role', async () => {
    const account = await userAccountService.createAccount({
      email: buildTestEmail('missing-role'),
      password: TEST_PASSWORD,
    });

    await expect(
      accessControlService.assignRoleToUser(account.id, 'AUTH006_MISSING'),
    ).rejects.toBeInstanceOf(RoleNotFoundError);
  });
});
