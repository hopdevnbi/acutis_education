import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('exam_attempt_questions')
@Index('IX_exam_attempt_questions_exam_attempt_id', ['examAttemptId'])
@Index('UQ_exam_attempt_questions_exam_attempt_id_sort_order', ['examAttemptId', 'sortOrder'], {
  unique: true,
})
@Index(
  'UQ_exam_attempt_questions_exam_attempt_id_question_version_id',
  ['examAttemptId', 'questionVersionId'],
  { unique: true },
)
export class ExamAttemptQuestionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  examAttemptId!: string;

  @Column({ type: 'uniqueidentifier' })
  questionId!: string;

  @Column({ type: 'uniqueidentifier' })
  questionVersionId!: string;

  @Column({ type: 'int' })
  sortOrder!: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  deliveredOptionOrderJson!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  translationRevisionId!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  deliveredLocale!: string | null;

  @Column({ type: 'char', length: 64 })
  sourceContentHash!: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;
}
