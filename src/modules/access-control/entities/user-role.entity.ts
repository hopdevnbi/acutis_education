import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('user_roles')
@Index('UQ_user_roles_user_id_role_id', ['userId', 'roleId'], { unique: true })
export class UserRoleEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  userId!: string;

  @PrimaryColumn({ type: 'uniqueidentifier' })
  roleId!: string;
}
