import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { ParishStatus } from '../enums/parish-status.enum';

@Entity('parishes')
export class ParishEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Index('UQ_parishes_code', { unique: true })
  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'nvarchar', length: 128 })
  name!: string;

  @Index('IX_parishes_status')
  @Column({ type: 'varchar', length: 32 })
  status!: ParishStatus;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
