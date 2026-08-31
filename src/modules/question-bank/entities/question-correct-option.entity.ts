import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('question_correct_options')
@Index('IX_question_correct_options_question_version_id', ['questionVersionId'])
export class QuestionCorrectOptionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  questionVersionId!: string;

  @PrimaryColumn({ type: 'uniqueidentifier' })
  optionId!: string;
}
