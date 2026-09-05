import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';

@Entity('milestone_achievements')
@Index('UQ_milestone_achievements_definition_student', ['milestoneDefinitionId', 'studentId'], {
  unique: true,
})
@Index('IX_milestone_achievements_student_id_achieved_at', ['studentId', 'achievedAt'])
export class MilestoneAchievementEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'milestone_definition_id' })
  milestoneDefinitionId!: string;

  @Column({ type: 'uniqueidentifier', name: 'student_id' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier', name: 'enrollment_id', nullable: true })
  enrollmentId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'parish_id' })
  parishId!: string;

  @Column({ type: 'datetime2', name: 'achieved_at' })
  achievedAt!: Date;

  @Column({ type: 'varchar', length: 64, name: 'source_type' })
  sourceType!: string;

  @Column({ type: 'uniqueidentifier', name: 'source_id' })
  sourceId!: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;
}
