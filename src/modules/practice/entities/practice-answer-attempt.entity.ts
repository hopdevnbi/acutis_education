import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('practice_answer_attempts')
@Index('IX_practice_answer_attempts_practice_session_question_id', ['practiceSessionQuestionId'])
export class PracticeAnswerAttemptEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  practiceSessionQuestionId!: string;

  @Column({ type: 'int' })
  attemptNumber!: number;

  @Column({ type: 'uniqueidentifier' })
  clientAnswerId!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  selectedOptionIdsJson!: string;

  @Column({ type: 'bit' })
  isCorrect!: boolean;

  @Column({ type: 'tinyint' })
  score!: number;

  @Column({ type: 'uniqueidentifier' })
  submittedByUserId!: string;

  @Column({ type: 'datetime2' })
  submittedAt!: Date;
}
