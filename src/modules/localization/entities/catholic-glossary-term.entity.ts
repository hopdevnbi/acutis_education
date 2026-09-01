import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';

@Entity('catholic_glossary_terms')
@Index('UQ_catholic_glossary_terms_version_id_source_term', ['glossaryVersionId', 'sourceTerm'], {
  unique: true,
})
@Index('IX_catholic_glossary_terms_glossary_version_id', ['glossaryVersionId'])
export class CatholicGlossaryTermEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'uniqueidentifier' })
  glossaryVersionId!: string;

  @Column({ type: 'nvarchar', length: 512 })
  sourceTerm!: string;

  @Column({ type: 'nvarchar', length: 512 })
  targetTerm!: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  notes!: string | null;

  @Column({ type: 'bit', default: false })
  caseSensitive!: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
