import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { QuestionStatus } from '../enums/question-status.enum';

@Entity('questions')
@Index('IX_questions_parish_id_status', ['parishId', 'status'])
export class QuestionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: QuestionStatus;

  @Column({ type: 'varchar', length: 32 })
  sourceLocale!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  currentPublishedVersionId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
