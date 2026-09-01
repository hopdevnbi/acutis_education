import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { LessonProgressPersistedStatus } from '../enums/lesson-progress-status.enum';

@Entity('lesson_progress')
@Index(
  'UQ_lesson_progress_enrollment_id_curriculum_id_canonical_lesson_key',
  ['enrollmentId', 'curriculumId', 'canonicalLessonKey'],
  { unique: true },
)
@Index('IX_lesson_progress_enrollment_id_status', ['enrollmentId', 'status'])
@Index('IX_lesson_progress_enrollment_id_curriculum_id', ['enrollmentId', 'curriculumId'])
@Index('IX_lesson_progress_enrollment_id_updated_at', ['enrollmentId', 'updatedAt'])
export class LessonProgressEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  enrollmentId!: string;

  @Column({ type: 'uniqueidentifier' })
  curriculumId!: string;

  @Column({ type: 'uniqueidentifier' })
  canonicalLessonKey!: string;

  @Column({ type: 'uniqueidentifier' })
  assignedCurriculumVersionId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: LessonProgressPersistedStatus;

  @Column({ type: 'datetime2' })
  startedAt!: Date;

  @Column({ type: 'uniqueidentifier' })
  startedByUserId!: string;

  @Column({ type: 'datetime2', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  completedByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
