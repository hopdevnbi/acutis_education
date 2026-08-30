import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';

@Entity('curriculum_versions')
@Index('IX_curriculum_versions_curriculum_id_status', ['curriculumId', 'status'])
@Index('UQ_curriculum_versions_curriculum_id_version_number', ['curriculumId', 'versionNumber'], {
  unique: true,
})
export class CurriculumVersionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  curriculumId!: string;

  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'varchar', length: 32 })
  status!: CurriculumVersionStatus;

  @Column({ type: 'nvarchar', length: 128, nullable: true })
  label!: string | null;

  @Column({ type: 'datetime2', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  publishedByUserId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
