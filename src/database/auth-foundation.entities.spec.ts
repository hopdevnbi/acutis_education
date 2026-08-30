import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { AuthSessionEntity } from '../modules/auth/entities/auth-session.entity';
import { PermissionEntity } from '../modules/access-control/entities/permission.entity';
import { RolePermissionEntity } from '../modules/access-control/entities/role-permission.entity';
import { RoleEntity } from '../modules/access-control/entities/role.entity';
import { UserRoleEntity } from '../modules/access-control/entities/user-role.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

function resolveTableName(entityTarget: EntityTarget<object>): string | undefined {
  const tableMetadata = getMetadataArgsStorage().tables.find(
    (table) => table.target === entityTarget,
  );

  return tableMetadata?.name;
}

describe('Auth foundation entities', () => {
  it('maps UserEntity to the users table with expected columns', () => {
    expect(resolveTableName(UserEntity)).toBe('users');

    const columnNames = getMetadataArgsStorage()
      .columns.filter((column) => column.target === UserEntity)
      .map((column) => column.options.name ?? column.propertyName);

    expect(columnNames).toEqual(
      expect.arrayContaining(['id', 'email', 'passwordHash', 'status', 'createdAt', 'updatedAt']),
    );
  });

  it('maps AuthSessionEntity to auth_sessions without cross-module relations', () => {
    expect(resolveTableName(AuthSessionEntity)).toBe('auth_sessions');

    const relationCount = getMetadataArgsStorage().relations.filter(
      (relation) => relation.target === AuthSessionEntity,
    ).length;

    expect(relationCount).toBe(0);
  });

  it('maps access-control entities to expected tables', () => {
    expect(resolveTableName(RoleEntity)).toBe('roles');
    expect(resolveTableName(PermissionEntity)).toBe('permissions');
    expect(resolveTableName(UserRoleEntity)).toBe('user_roles');
    expect(resolveTableName(RolePermissionEntity)).toBe('role_permissions');
  });

  it('uses composite primary keys on assignment join entities', () => {
    const userRolePrimaryColumns = getMetadataArgsStorage()
      .columns.filter(
        (column) => column.target === UserRoleEntity && column.options.primary === true,
      )
      .map((column) => column.propertyName);

    expect(userRolePrimaryColumns.sort()).toEqual(['roleId', 'userId']);

    const rolePermissionPrimaryColumns = getMetadataArgsStorage()
      .columns.filter(
        (column) => column.target === RolePermissionEntity && column.options.primary === true,
      )
      .map((column) => column.propertyName);

    expect(rolePermissionPrimaryColumns.sort()).toEqual(['permissionId', 'roleId']);
  });

  it('uses application-assigned primary keys instead of generated columns', () => {
    const generatedColumnCount = getMetadataArgsStorage().generations.filter((generation) =>
      [UserEntity, RoleEntity, PermissionEntity, AuthSessionEntity].includes(
        generation.target as typeof UserEntity,
      ),
    ).length;

    expect(generatedColumnCount).toBe(0);
  });
});
