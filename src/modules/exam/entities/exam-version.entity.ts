import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ExamVersionStatus } from '../enums/exam-version-status.enum';

@Entity('exam_versions')
@Index('IX_exam_versions_exam_id_status', ['examId', 'status'])
@Index('UQ_exam_versions_exam_id_version_number', ['examId', 'versionNumber'], { unique: true })
export class ExamVersionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  examId!: string;

  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'nvarchar', length: 256 })
  title!: string;

  @Column({ type: 'nvarchar', length: 512, nullable: true })
  description!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  instructions!: string | null;

  @Column({ type: 'varchar', length: 32 })
  sourceLocale!: string;

  @Column({ type: 'int' })
  durationMinutes!: number;

  @Column({ type: 'int' })
  maxAttempts!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  passingScorePercent!: string | null;

  @Column({ type: 'bit' })
  shuffleQuestions!: boolean;

  @Column({ type: 'bit' })
  shuffleOptions!: boolean;

  @Column({ type: 'nvarchar', length: 'MAX' })
  reviewPolicyJson!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: ExamVersionStatus;

  @Column({ type: 'datetime2', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  publishedByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
