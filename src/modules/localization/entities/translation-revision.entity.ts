import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';

@Entity('translation_revisions')
@Index(
  'UQ_translation_revisions_resource_id_target_locale_revision_number',
  ['translationResourceId', 'targetLocale', 'revisionNumber'],
  { unique: true },
)
@Index('IX_translation_revisions_resource_id_target_locale_status', [
  'translationResourceId',
  'targetLocale',
  'status',
])
export class TranslationRevisionEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  translationResourceId!: string;

  @Column({ type: 'varchar', length: 32 })
  targetLocale!: string;

  @Column({ type: 'int' })
  revisionNumber!: number;

  @Column({ type: 'varchar', length: 64 })
  sourceContentHash!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sourceVersionKey!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: TranslationRevisionStatus;

  @Column({ type: 'nvarchar', length: 'MAX' })
  payloadJson!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  providerId!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerModel!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  glossaryVersionId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  createdByUserId!: string | null;

  @Column({ type: 'uniqueidentifier', nullable: true })
  approvedByUserId!: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @Column({ type: 'datetime2', nullable: true })
  approvedAt!: Date | null;
}
