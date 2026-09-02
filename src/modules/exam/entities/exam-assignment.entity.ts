import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';

@Entity('exam_assignments')
@Index('IX_exam_assignments_class_id_status', ['classId', 'status'])
@Index('IX_exam_assignments_exam_version_id', ['examVersionId'])
export class ExamAssignmentEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  examVersionId!: string;

  @Column({ type: 'uniqueidentifier' })
  classId!: string;

  @Column({ type: 'datetime2' })
  opensAt!: Date;

  @Column({ type: 'datetime2' })
  closesAt!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: ExamAssignmentStatus;

  @Column({ type: 'uniqueidentifier' })
  createdByUserId!: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
