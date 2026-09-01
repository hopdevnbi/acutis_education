import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { CatholicGlossaryVersionStatus } from '../enums/catholic-glossary-version-status.enum';

@Entity('catholic_glossary_versions')
@Index(
  'UQ_catholic_glossary_versions_locales_version_number',
  ['sourceLocale', 'targetLocale', 'versionNumber'],
  { unique: true },
)
@Index('IX_catholic_glossary_versions_locales_status', ['sourceLocale', 'targetLocale', 'status'])
export class CatholicGlossaryVersionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 32 })
  sourceLocale!: string;

  @Column({ type: 'varchar', length: 32 })
  targetLocale!: string;

  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'varchar', length: 32 })
  status!: CatholicGlossaryVersionStatus;

  @Column({ type: 'varchar', length: 256, nullable: true })
  providerGlossaryId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  createdByUserId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  publishedByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  publishedAt!: Date | null;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
