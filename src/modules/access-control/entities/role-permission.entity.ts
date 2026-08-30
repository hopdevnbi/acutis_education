import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('role_permissions')
@Index('UQ_role_permissions_role_id_permission_id', ['roleId', 'permissionId'], { unique: true })
export class RolePermissionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  roleId!: string;

  @PrimaryColumn({ type: 'uniqueidentifier' })
  permissionId!: string;
}
