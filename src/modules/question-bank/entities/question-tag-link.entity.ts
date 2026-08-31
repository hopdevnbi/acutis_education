import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('question_tag_links')
@Index('IX_question_tag_links_tag_id', ['tagId'])
export class QuestionTagLinkEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  questionId!: string;

  @PrimaryColumn({ type: 'uniqueidentifier' })
  tagId!: string;
}
