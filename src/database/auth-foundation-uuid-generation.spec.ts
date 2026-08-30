import { isUuidV4 } from '../database/uuid-v4.util';
import { AuthSessionEntity } from '../modules/auth/entities/auth-session.entity';
import { PermissionEntity } from '../modules/access-control/entities/permission.entity';
import { RoleEntity } from '../modules/access-control/entities/role.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { UserStatus } from '../modules/users/enums/user-status.enum';

describe('Auth foundation entity UUID generation', () => {
  it.each([
    ['UserEntity', () => new UserEntity()],
    ['RoleEntity', () => new RoleEntity()],
    ['PermissionEntity', () => new PermissionEntity()],
    ['AuthSessionEntity', () => new AuthSessionEntity()],
  ])('assigns RFC UUID v4 ids to new %s instances', (_label, createEntity) => {
    const firstEntity = createEntity() as { id: string };
    const secondEntity = createEntity() as { id: string };

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('does not regenerate id when UserEntity is constructed with explicit values', () => {
    const explicitId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const user = new UserEntity();
    user.id = explicitId;
    user.email = 'teacher@parish.example';
    user.passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$placeholder';
    user.status = UserStatus.Active;

    expect(user.id).toBe(explicitId);
  });
});
