import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { TranslationJobStatus } from '../enums/translation-job-status.enum';

@Entity('translation_jobs')
@Index('IX_translation_jobs_status_next_attempt_at_created_at', [
  'status',
  'nextAttemptAt',
  'createdAt',
])
@Index('IX_translation_jobs_resource_target_locale_source_hash', [
  'translationResourceId',
  'targetLocale',
  'sourceContentHash',
])
export class TranslationJobEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  translationResourceId!: string;

  @Column({ type: 'varchar', length: 32 })
  targetLocale!: string;

  @Column({ type: 'varchar', length: 64 })
  sourceContentHash!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sourceVersionKey!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: TranslationJobStatus;

  @Column({ type: 'int' })
  attemptCount!: number;

  @Column({ type: 'int' })
  maxAttempts!: number;

  @Column({ type: 'uniqueidentifier', nullable: true })
  requestedByUserId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  providerId!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  lastErrorCode!: string | null;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  lastErrorMessage!: string | null;

  @Column({ type: 'datetime2', nullable: true })
  nextAttemptAt!: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  lockedAt!: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
