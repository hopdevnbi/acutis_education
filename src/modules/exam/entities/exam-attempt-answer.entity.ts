import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('exam_attempt_answers')
@Index('IX_exam_attempt_answers_exam_attempt_question_id', ['examAttemptQuestionId'])
@Index('UQ_exam_attempt_answers_exam_attempt_question_id', ['examAttemptQuestionId'], {
  unique: true,
})
export class ExamAttemptAnswerEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  examAttemptQuestionId!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  selectedOptionIdsJson!: string;

  @Column({ type: 'datetime2' })
  savedAt!: Date;

  @Column({ type: 'uniqueidentifier' })
  savedByUserId!: string;

  @Column({ type: 'uniqueidentifier' })
  clientAnswerId!: string;
}
