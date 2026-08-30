import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { StudentStatus } from '../enums/student-status.enum';

@Entity('students')
export class StudentEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier', nullable: true })
  userId!: string | null;

  @Column({ type: 'nvarchar', length: 128 })
  fullName!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: StudentStatus;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
