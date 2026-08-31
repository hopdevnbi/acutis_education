import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionType } from '../enums/practice-session-type.enum';

@Entity('practice_sessions')
@Index('IX_practice_sessions_enrollment_id_status', ['enrollmentId', 'status'])
@Index('IX_practice_sessions_enrollment_id_created_at', ['enrollmentId', 'createdAt'])
@Index('IX_practice_sessions_source_session_id', ['sourceSessionId'])
@Index('IX_practice_sessions_curriculum_id_canonical_lesson_key', [
  'curriculumId',
  'canonicalLessonKey',
])
export class PracticeSessionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  enrollmentId!: string;

  @Column({ type: 'varchar', length: 32 })
  sessionType!: PracticeSessionType;

  @Column({ type: 'uniqueidentifier', nullable: true })
  sourceSessionId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: PracticeSessionStatus;

  @Column({ type: 'varchar', length: 32 })
  locale!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  curriculumId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  canonicalLessonKey!: string | null;

  @Column({ type: 'int' })
  requestedQuestionCount!: number;

  @Column({ type: 'int' })
  maxAttemptsPerQuestion!: number;

  @Column({ type: 'bit' })
  randomizeQuestions!: boolean;

  @Column({ type: 'bit' })
  randomizeOptions!: boolean;

  @Column({ type: 'uniqueidentifier', nullable: true })
  clientRequestId!: string | null;

  @Column({ type: 'uniqueidentifier' })
  createdByUserId!: string;

  @Column({ type: 'datetime2' })
  startedAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  abandonedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
