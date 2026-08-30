import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('topics')
@Index('IX_topics_curriculum_version_id_sort_order', ['curriculumVersionId', 'sortOrder'])
export class TopicEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  curriculumVersionId!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  code!: string | null;

  @Column({ type: 'nvarchar', length: 256 })
  title!: string;

  @Column({ type: 'nvarchar', length: 1024, nullable: true })
  description!: string | null;

  @Column({ type: 'int' })
  sortOrder!: number;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
