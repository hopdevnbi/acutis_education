import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';

export class CurriculumVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  curriculumId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty({ enum: CurriculumVersionStatus })
  status!: CurriculumVersionStatus;

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  publishedByUserId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
