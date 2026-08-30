import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth_sessions')
export class AuthSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_auth_sessions_user_id')
  @Column({ type: 'uniqueidentifier' })
  userId!: string;

  @Column({ type: 'nvarchar', length: 255 })
  refreshTokenHash!: string;

  @Index('IDX_auth_sessions_token_family_id')
  @Column({ type: 'uniqueidentifier' })
  tokenFamilyId!: string;

  @Column({ type: 'datetime2' })
  expiresAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;
}
