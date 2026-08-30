import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { isoDateOnlyColumnTransformer } from '../../../database/iso-date-only-column.transformer';
import { AcademicYearStatus } from '../enums/academic-year-status.enum';

@Entity('academic_years')
@Index('IX_academic_years_parish_id', ['parishId'])
@Index('IX_academic_years_parish_id_status', ['parishId', 'status'])
@Index('UQ_academic_years_parish_id_name', ['parishId', 'name'], { unique: true })
export class AcademicYearEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'date', transformer: isoDateOnlyColumnTransformer })
  startDate!: string;

  @Column({ type: 'date', transformer: isoDateOnlyColumnTransformer })
  endDate!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: AcademicYearStatus;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
