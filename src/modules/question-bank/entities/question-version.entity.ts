import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';

@Entity('question_versions')
@Index('IX_question_versions_question_id_status', ['questionId', 'status'])
@Index('IX_question_versions_question_type', ['questionType'])
@Index('IX_question_versions_difficulty', ['difficulty'])
@Index('UQ_question_versions_question_id_version_number', ['questionId', 'versionNumber'], {
  unique: true,
})
export class QuestionVersionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  questionId!: string;

  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'varchar', length: 32 })
  status!: QuestionVersionStatus;

  @Column({ type: 'varchar', length: 32 })
  questionType!: QuestionType;

  @Column({ type: 'nvarchar', length: 2000 })
  prompt!: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  instruction!: string | null;

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  explanation!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  promptMediaJson!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  explanationMediaJson!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  answerDefinitionJson!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  difficulty!: QuestionDifficulty | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sourceContentHash!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  createdByUserId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  publishedByUserId!: string | null;

  @Column({ type: 'datetime2', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
