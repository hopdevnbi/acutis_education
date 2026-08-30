import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurriculumStatus } from '../enums/curriculum-status.enum';

export class CurriculumResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ format: 'uuid' })
  catechismLevelId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: CurriculumStatus })
  status!: CurriculumStatus;

  @ApiProperty({ example: 'vi-VN' })
  sourceLocale!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  currentPublishedVersionId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
