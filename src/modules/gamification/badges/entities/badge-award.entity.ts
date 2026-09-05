import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';

@Entity('badge_awards')
@Index('IX_badge_awards_student_id_awarded_at', ['studentId', 'awardedAt'])
@Index('IX_badge_awards_parish_id', ['parishId'])
export class BadgeAwardEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'badge_definition_id' })
  badgeDefinitionId!: string;

  @Column({ type: 'uniqueidentifier', name: 'student_id' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier', name: 'enrollment_id', nullable: true })
  enrollmentId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'parish_id' })
  parishId!: string;

  @Column({ type: 'datetime2', name: 'awarded_at' })
  awardedAt!: Date;

  @Column({ type: 'varchar', length: 64, name: 'source_type' })
  sourceType!: string;

  @Column({ type: 'uniqueidentifier', name: 'source_id' })
  sourceId!: string;

  @Column({ type: 'uniqueidentifier', name: 'awarded_by_user_id', nullable: true })
  awardedByUserId!: string | null;

  @Column({ type: 'datetime2', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;
}
