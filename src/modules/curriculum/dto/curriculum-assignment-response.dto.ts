import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CurriculumAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ format: 'uuid' })
  academicYearId!: string;

  @ApiProperty({ format: 'uuid' })
  catechismLevelId!: string;

  @ApiProperty({ format: 'uuid' })
  curriculumVersionId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedByUserId!: string | null;

  @ApiProperty({ format: 'date-time' })
  assignedAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
