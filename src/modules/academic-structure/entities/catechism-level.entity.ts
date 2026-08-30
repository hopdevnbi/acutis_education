import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { CatechismLevelStatus } from '../enums/catechism-level-status.enum';

@Entity('catechism_levels')
@Index('IX_catechism_levels_parish_id', ['parishId'])
@Index('IX_catechism_levels_parish_id_sort_order', ['parishId', 'sortOrder'])
@Index('UQ_catechism_levels_parish_id_code', ['parishId', 'code'], { unique: true })
export class CatechismLevelEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  parishId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 32 })
  status!: CatechismLevelStatus;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
