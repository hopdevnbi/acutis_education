import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';
import { MissionProgressStatus } from '../../enums/gamification.enums';

@Entity('mission_progress')
@Index('UQ_mission_progress_mission_definition_id_student_id', ['missionDefinitionId', 'studentId'], {
  unique: true,
})
@Index('IX_mission_progress_student_id_status', ['studentId', 'status'])
export class MissionProgressEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'mission_definition_id' })
  missionDefinitionId!: string;

  @Column({ type: 'uniqueidentifier', name: 'student_id' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier', name: 'enrollment_id', nullable: true })
  enrollmentId!: string | null;

  @Column({ type: 'int', name: 'current_count' })
  currentCount!: number;

  @Column({ type: 'int', name: 'target_count' })
  targetCount!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: MissionProgressStatus;

  @Column({ type: 'datetime2', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'uniqueidentifier', name: 'last_event_id', nullable: true })
  lastEventId!: string | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
