import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { ExamAutoSubmitReason } from '../enums/exam-auto-submit-reason.enum';

@Entity('exam_attempts')
@Index('IX_exam_attempts_exam_assignment_id_status', ['examAssignmentId', 'status'])
@Index('IX_exam_attempts_enrollment_id_exam_assignment_id', ['enrollmentId', 'examAssignmentId'])
@Index('IX_exam_attempts_student_id', ['studentId'])
@Index(
  'UQ_exam_attempts_enrollment_id_exam_assignment_id_attempt_number',
  ['enrollmentId', 'examAssignmentId', 'attemptNumber'],
  { unique: true },
)
export class ExamAttemptEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  examAssignmentId!: string;

  @Column({ type: 'uniqueidentifier' })
  enrollmentId!: string;

  @Column({ type: 'int' })
  attemptNumber!: number;

  @Column({ type: 'uniqueidentifier' })
  startedByUserId!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  clientRequestId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: ExamAttemptStatus;

  @Column({ type: 'varchar', length: 32, nullable: true })
  autoSubmitReason!: ExamAutoSubmitReason | null;

  @Column({ type: 'uniqueidentifier' })
  examId!: string;

  @Column({ type: 'uniqueidentifier' })
  examVersionId!: string;

  @Column({ type: 'uniqueidentifier' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier' })
  classId!: string;

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  academicYearId!: string;

  @Column({ type: 'uniqueidentifier' })
  catechismLevelId!: string;

  @Column({ type: 'nvarchar', length: 256 })
  examTitleDelivered!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  instructionsDelivered!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  examTranslationRevisionId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  deliveredLocale!: string;

  @Column({ type: 'datetime2' })
  startedAt!: Date;

  @Column({ type: 'datetime2' })
  deadlineAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  gradedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  questionCount!: number | null;

  @Column({ type: 'int', nullable: true })
  correctCount!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  scorePercent!: string | null;

  @Column({ type: 'bit', nullable: true })
  passed!: boolean | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
