import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('lesson_contents')
@Index('UQ_lesson_contents_lesson_id', ['lessonId'], { unique: true })
export class LessonContentEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  lessonId!: string;

  @Column({ type: 'int' })
  contentSchemaVersion!: number;

  @Column({ type: 'nvarchar', length: 'MAX' })
  contentJson!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contentHash!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
