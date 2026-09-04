import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('class_session_roster')
@Index('UQ_class_session_roster_session_id_enrollment_id', ['sessionId', 'enrollmentId'], {
  unique: true,
})
@Index('IX_class_session_roster_session_id', ['sessionId'])
@Index('IX_class_session_roster_enrollment_id', ['enrollmentId'])
export class ClassSessionRosterEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  sessionId!: string;

  @Column({ type: 'uniqueidentifier' })
  enrollmentId!: string;

  @Column({ type: 'uniqueidentifier' })
  studentId!: string;

  @Column({ type: 'nvarchar', length: 128 })
  displayNameSnapshot!: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;
}
