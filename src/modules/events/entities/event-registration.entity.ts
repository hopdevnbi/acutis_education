import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { EventRegistrationStatus } from '../enums/event.enums';

@Entity('event_registrations')
@Index('UQ_event_registrations_event_registrant', ['eventId', 'registrantKey'], { unique: true })
@Index('IX_event_registrations_event_status', ['eventId', 'status'])
@Index('IX_event_registrations_user', ['userId', 'status'])
export class EventRegistrationEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'event_id' })
  eventId!: string;

  @Column({ type: 'varchar', length: 64, name: 'registrant_key' })
  registrantKey!: string;

  @Column({ type: 'uniqueidentifier', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uniqueidentifier', name: 'student_id', nullable: true })
  studentId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'enrollment_id', nullable: true })
  enrollmentId!: string | null;

  @Column({ type: 'varchar', length: 16, default: EventRegistrationStatus.Registered })
  status!: EventRegistrationStatus;

  @Column({ type: 'datetime2', name: 'registered_at' })
  registeredAt!: Date;

  @Column({ type: 'datetime2', name: 'cancelled_at', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'datetime2', name: 'checked_in_at', nullable: true })
  checkedInAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt!: Date;
}
