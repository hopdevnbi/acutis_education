import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../../database/uuid-v4.util';
import { PointSourceType } from '../../enums/gamification.enums';

@Entity('point_ledger_entries')
@Index('UQ_point_ledger_entries_student_source_reason', [
  'studentId',
  'sourceType',
  'sourceId',
  'reasonCode',
], { unique: true })
@Index('IX_point_ledger_entries_student_id_created_at', ['studentId', 'createdAt'])
@Index('IX_point_ledger_entries_parish_id_created_at', ['parishId', 'createdAt'])
@Index('IX_point_ledger_entries_source_type_source_id', ['sourceType', 'sourceId'])
export class PointLedgerEntryEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', name: 'student_id' })
  studentId!: string;

  @Column({ type: 'uniqueidentifier', name: 'enrollment_id', nullable: true })
  enrollmentId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'parish_id' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier', name: 'academic_year_id', nullable: true })
  academicYearId!: string | null;

  @Column({ type: 'int', name: 'points_delta' })
  pointsDelta!: number;

  @Column({ type: 'varchar', length: 64, name: 'source_type' })
  sourceType!: PointSourceType | string;

  @Column({ type: 'uniqueidentifier', name: 'source_id' })
  sourceId!: string;

  @Column({ type: 'varchar', length: 128, name: 'reason_code' })
  reasonCode!: string;

  @Column({ type: 'nvarchar', length: 256, name: 'description_key', nullable: true })
  descriptionKey!: string | null;

  @Column({ type: 'nvarchar', length: 500, name: 'staff_note', nullable: true })
  staffNote!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'awarded_by_user_id', nullable: true })
  awardedByUserId!: string | null;

  @Column({ type: 'uniqueidentifier', name: 'related_ledger_entry_id', nullable: true })
  relatedLedgerEntryId!: string | null;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;
}
