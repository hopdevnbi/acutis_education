import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { CurriculumStatus } from '../enums/curriculum-status.enum';

@Entity('curriculums')
@Index('IX_curriculums_parish_id_catechism_level_id', ['parishId', 'catechismLevelId'])
@Index(
  'UQ_curriculums_parish_id_catechism_level_id_code',
  ['parishId', 'catechismLevelId', 'code'],
  {
    unique: true,
  },
)
export class CurriculumEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'uniqueidentifier' })
  catechismLevelId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'nvarchar', length: 512, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: CurriculumStatus;

  @Column({ type: 'varchar', length: 32 })
  sourceLocale!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  currentPublishedVersionId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
