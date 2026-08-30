import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

@Entity('enrollments')
@Index('IX_enrollments_class_id_status', ['classId', 'status'])
@Index('IX_enrollments_student_id', ['studentId'])
@Index('IX_enrollments_parish_id_academic_year_id', ['parishId', 'academicYearId'])
export class EnrollmentEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier' })
  classId!: string;

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  academicYearId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: EnrollmentStatus;

  @Column({ type: 'datetime2' })
  enrolledAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  leftAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
