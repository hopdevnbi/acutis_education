import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ExamStatus } from '../enums/exam-status.enum';

@Entity('exams')
@Index('IX_exams_parish_id_status', ['parishId', 'status'])
@Index('UQ_exams_parish_id_code', ['parishId', 'code'], { unique: true })
export class ExamEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: ExamStatus;

  @Column({ type: 'uniqueidentifier', nullable: true })
  currentPublishedVersionId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
