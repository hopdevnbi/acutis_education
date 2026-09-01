import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';

@Entity('translation_resources')
@Index('UQ_translation_resources_resource_type_resource_id', ['resourceType', 'resourceId'], {
  unique: true,
})
@Index('IX_translation_resources_parish_id', ['parishId'])
export class TranslationResourceEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 64 })
  resourceType!: TranslationResourceType;

  @Column({ type: 'uniqueidentifier' })
  resourceId!: string;

  @Column({ type: 'uniqueidentifier', nullable: true })
  parishId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  sourceLocale!: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt!: Date;
}
