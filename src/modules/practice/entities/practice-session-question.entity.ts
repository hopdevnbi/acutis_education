import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('practice_session_questions')
@Index('IX_practice_session_questions_practice_session_id', ['practiceSessionId'])
export class PracticeSessionQuestionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  practiceSessionId!: string;

  @Column({ type: 'uniqueidentifier' })
  questionVersionId!: string;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  deliveredOptionOrderJson!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;
}
