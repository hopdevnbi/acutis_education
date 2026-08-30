import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('lessons')
@Index('IX_lessons_topic_id_sort_order', ['topicId', 'sortOrder'])
@Index('IX_lessons_curriculum_version_id', ['curriculumVersionId'])
@Index('IX_lessons_canonical_lesson_key', ['canonicalLessonKey'])
export class LessonEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  curriculumVersionId!: string;

  @Column({ type: 'uniqueidentifier' })
  topicId!: string;

  @Column({ type: 'uniqueidentifier' })
  canonicalLessonKey: string = generateUuidV4();

  @Column({ type: 'varchar', length: 32, nullable: true })
  code!: string | null;

  @Column({ type: 'nvarchar', length: 256 })
  title!: string;

  @Column({ type: 'nvarchar', length: 1024, nullable: true })
  summary!: string | null;

  @Column({ type: 'int' })
  sortOrder!: number;

  @Column({ type: 'int', nullable: true })
  estimatedDurationMinutes!: number | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
