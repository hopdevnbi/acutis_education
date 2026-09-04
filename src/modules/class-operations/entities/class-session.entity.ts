import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ClassSessionStatus } from '../enums/class-session-status.enum';

@Entity('class_sessions')
@Index('IX_class_sessions_class_id_starts_at', ['classId', 'startsAt'])
@Index('IX_class_sessions_parish_id_starts_at', ['parishId', 'startsAt'])
@Index('IX_class_sessions_status', ['status'])
export class ClassSessionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  classId!: string;

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  academicYearId!: string;

  @Column({ type: 'nvarchar', length: 128, nullable: true })
  title!: string | null;

  @Column({ type: 'datetime2' })
  startsAt!: Date;

  @Column({ type: 'datetime2' })
  endsAt!: Date;

  @Column({ type: 'varchar', length: 32 })
  status!: ClassSessionStatus;

  @Column({ type: 'datetime2', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'uniqueidentifier' })
  createdByUserId!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  updatedByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
