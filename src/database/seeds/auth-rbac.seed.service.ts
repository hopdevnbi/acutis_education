import { Injectable, Logger } from '@nestjs/common';
import {
  PermissionCodeAlreadyExistsError,
  RoleCodeAlreadyExistsError,
} from '../../modules/access-control/errors/access-control.errors';
import { AccessControlService } from '../../modules/access-control/services/access-control.service';
import { UserEmailAlreadyExistsError } from '../../modules/users/errors/user-account.errors';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import {
  AUTH_RBAC_ROLE_PERMISSION_MATRIX,
  AUTH_RBAC_SAMPLE_PASSWORD,
  AUTH_RBAC_SEED_PERMISSIONS,
  AUTH_RBAC_SEED_ROLES,
  AUTH_RBAC_SEED_USERS,
} from './auth-rbac.seed.constants';

export interface AuthRbacSeedSummary {
  permissionsCreated: number;
  permissionsExisting: number;
  rolesCreated: number;
  rolesExisting: number;
  rolePermissionAssignments: number;
  usersCreated: number;
  usersExisting: number;
  userRoleAssignments: number;
}

@Injectable()
export class AuthRbacSeedService {
  private readonly logger = new Logger(AuthRbacSeedService.name);

  constructor(
    private readonly userAccountService: UserAccountService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async run(): Promise<AuthRbacSeedSummary> {
    const summary: AuthRbacSeedSummary = {
      permissionsCreated: 0,
      permissionsExisting: 0,
      rolesCreated: 0,
      rolesExisting: 0,
      rolePermissionAssignments: 0,
      usersCreated: 0,
      usersExisting: 0,
      userRoleAssignments: 0,
    };

    for (const permission of AUTH_RBAC_SEED_PERMISSIONS) {
      try {
        await this.accessControlService.createPermission({
          code: permission.code,
          name: permission.name,
          description: permission.description,
        });
        summary.permissionsCreated += 1;
        this.logger.log(`Created permission ${permission.code}.`);
      } catch (error: unknown) {
        if (error instanceof PermissionCodeAlreadyExistsError) {
          summary.permissionsExisting += 1;
          this.logger.log(`Permission ${permission.code} already exists.`);
          continue;
        }

        throw error;
      }
    }

    for (const role of AUTH_RBAC_SEED_ROLES) {
      try {
        await this.accessControlService.createRole({
          code: role.code,
          name: role.name,
          description: role.description,
        });
        summary.rolesCreated += 1;
        this.logger.log(`Created role ${role.code}.`);
      } catch (error: unknown) {
        if (error instanceof RoleCodeAlreadyExistsError) {
          summary.rolesExisting += 1;
          this.logger.log(`Role ${role.code} already exists.`);
          continue;
        }

        throw error;
      }
    }

    for (const [roleCode, permissionCodes] of Object.entries(AUTH_RBAC_ROLE_PERMISSION_MATRIX)) {
      for (const permissionCode of permissionCodes) {
        await this.accessControlService.assignPermissionToRole(roleCode, permissionCode);
        summary.rolePermissionAssignments += 1;
      }
    }

    this.logger.log('Role-permission assignments reconciled.');

    for (const seedUser of AUTH_RBAC_SEED_USERS) {
      let userId: string;

      try {
        const createdAccount = await this.userAccountService.createAccount({
          email: seedUser.email,
          password: AUTH_RBAC_SAMPLE_PASSWORD,
        });
        userId = createdAccount.id;
        summary.usersCreated += 1;
        this.logger.log(`Created sample user ${seedUser.email}.`);
      } catch (error: unknown) {
        if (error instanceof UserEmailAlreadyExistsError) {
          const existingAccount = await this.userAccountService.findAccountSnapshotByEmail(
            seedUser.email,
          );

          if (existingAccount === null) {
            throw error;
          }

          userId = existingAccount.id;
          summary.usersExisting += 1;
          this.logger.log(`Sample user ${seedUser.email} already exists; password unchanged.`);
        } else {
          throw error;
        }
      }

      await this.accessControlService.assignRoleToUser(userId, seedUser.roleCode);
      summary.userRoleAssignments += 1;
      this.logger.log(`Assigned role ${seedUser.roleCode} to ${seedUser.email}.`);
    }

    return summary;
  }
}
