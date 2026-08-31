import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('question_curriculum_links')
@Index('IX_question_curriculum_links_question_id', ['questionId'])
@Index('IX_question_curriculum_links_curriculum_id', ['curriculumId'])
@Index('IX_question_curriculum_links_canonical_lesson_key', ['canonicalLessonKey'])
export class QuestionCurriculumLinkEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  questionId!: string;

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  curriculumId!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  canonicalLessonKey!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  authoringCurriculumVersionId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;
}
