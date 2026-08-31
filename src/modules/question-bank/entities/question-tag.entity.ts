import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { QuestionTagStatus } from '../enums/question-tag-status.enum';

@Entity('question_tags')
@Index('IX_question_tags_parish_id_status', ['parishId', 'status'])
@Index('UQ_question_tags_parish_id_code', ['parishId', 'code'], { unique: true })
export class QuestionTagEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: QuestionTagStatus;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
