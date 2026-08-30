import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { GuardianLinkStatus } from '../enums/guardian-link-status.enum';
import { GuardianRelationshipType } from '../enums/guardian-relationship-type.enum';

@Entity('student_guardians')
export class StudentGuardianEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier' })
  guardianUserId!: string;

  @Column({ type: 'varchar', length: 32 })
  relationshipType!: GuardianRelationshipType;

  @Column({ type: 'bit', default: false })
  isPrimary!: boolean;

  @Column({ type: 'varchar', length: 32 })
  status!: GuardianLinkStatus;

  @Column({ type: 'datetime2' })
  startsAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
