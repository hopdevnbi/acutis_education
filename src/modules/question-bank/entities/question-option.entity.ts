import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('question_options')
@Index('IX_question_options_question_version_id', ['questionVersionId'])
@Index('UQ_question_options_question_version_id_sort_order', ['questionVersionId', 'sortOrder'], {
  unique: true,
})
@Index('UQ_question_options_question_version_id_id', ['questionVersionId', 'id'], {
  unique: true,
})
export class QuestionOptionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  questionVersionId!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  code!: string | null;

  @Column({ type: 'nvarchar', length: 512, nullable: true })
  text!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  mediaAssetId!: string | null;

  @Column({ type: 'int' })
  sortOrder!: number;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
