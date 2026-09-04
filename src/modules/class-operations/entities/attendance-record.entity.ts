import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { AttendanceStatus } from '../enums/attendance-status.enum';

@Entity('attendance_records')
@Index('UQ_attendance_records_session_id_enrollment_id', ['sessionId', 'enrollmentId'], {
  unique: true,
})
@Index('IX_attendance_records_session_id', ['sessionId'])
@Index('IX_attendance_records_enrollment_id', ['enrollmentId'])
export class AttendanceRecordEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  sessionId!: string;

  @Column({ type: 'uniqueidentifier' })
  enrollmentId!: string;

  @Column({ type: 'uniqueidentifier' })
  studentId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: AttendanceStatus;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ type: 'uniqueidentifier' })
  markedByUserId!: string;

  @Column({ type: 'datetime2' })
  markedAt!: Date;

  @Column({ type: 'uniqueidentifier', nullable: true })
  updatedByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
