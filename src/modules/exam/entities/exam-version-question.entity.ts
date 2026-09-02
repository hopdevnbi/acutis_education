import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('exam_version_questions')
@Index('IX_exam_version_questions_exam_version_id', ['examVersionId'])
@Index('UQ_exam_version_questions_exam_version_id_sort_order', ['examVersionId', 'sortOrder'], {
  unique: true,
})
@Index('UQ_exam_version_questions_exam_version_id_question_id', ['examVersionId', 'questionId'], {
  unique: true,
})
export class ExamVersionQuestionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  examVersionId!: string;

  @Column({ type: 'uniqueidentifier' })
  questionId!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  questionVersionId!: string | null;

  @Column({ type: 'int' })
  sortOrder!: number;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;
}
