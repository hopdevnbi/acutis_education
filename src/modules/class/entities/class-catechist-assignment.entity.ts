import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { CatechistAssignmentRole } from '../enums/catechist-assignment-role.enum';
import { CatechistAssignmentStatus } from '../enums/catechist-assignment-status.enum';

@Entity('class_catechist_assignments')
@Index('IX_class_catechist_assignments_class_id_status', ['classId', 'status'])
@Index('IX_class_catechist_assignments_catechist_user_id_status', ['catechistUserId', 'status'])
export class ClassCatechistAssignmentEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  classId!: string;

  @Column({ type: 'uniqueidentifier' })
  catechistUserId!: string;

  @Column({ type: 'varchar', length: 32 })
  assignmentRole!: CatechistAssignmentRole;

  @Column({ type: 'varchar', length: 32 })
  status!: CatechistAssignmentStatus;

  @Column({ type: 'datetime2' })
  assignedAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
