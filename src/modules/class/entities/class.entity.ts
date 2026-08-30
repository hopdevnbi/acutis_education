import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ClassStatus } from '../enums/class-status.enum';

@Entity('classes')
@Index('IX_classes_parish_id_academic_year_id', ['parishId', 'academicYearId'])
@Index('IX_classes_parish_id_status', ['parishId', 'status'])
@Index('IX_classes_academic_year_id', ['academicYearId'])
@Index('IX_classes_catechism_level_id', ['catechismLevelId'])
@Index('UQ_classes_parish_id_academic_year_id_code', ['parishId', 'academicYearId', 'code'], {
  unique: true,
})
export class ClassEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  academicYearId!: string;

  @Column({ type: 'uniqueidentifier' })
  catechismLevelId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: ClassStatus;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
