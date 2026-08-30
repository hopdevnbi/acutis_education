import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ParishMembershipStatus } from '../enums/parish-membership-status.enum';

@Entity('parish_memberships')
@Index('IX_parish_memberships_user_id_status', ['userId', 'status'])
@Index('IX_parish_memberships_parish_id_status', ['parishId', 'status'])
export class ParishMembershipEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: ParishMembershipStatus;

  @Column({ type: 'datetime2' })
  joinedAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
