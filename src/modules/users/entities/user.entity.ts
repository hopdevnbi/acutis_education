import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { UserStatus } from '../enums/user-status.enum';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'nvarchar', length: 320 })
  email!: string;

  @Column({ type: 'nvarchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: UserStatus;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
