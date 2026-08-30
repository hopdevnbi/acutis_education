import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('curriculum_assignments')
@Index(
  'UQ_curriculum_assignments_parish_year_level',
  ['parishId', 'academicYearId', 'catechismLevelId'],
  {
    unique: true,
  },
)
export class CurriculumAssignmentEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  academicYearId!: string;

  @Column({ type: 'uniqueidentifier' })
  catechismLevelId!: string;

  @Column({ type: 'uniqueidentifier' })
  curriculumVersionId!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  assignedByUserId!: string | null;

  @Column({ type: 'datetime2' })
  assignedAt!: Date;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
