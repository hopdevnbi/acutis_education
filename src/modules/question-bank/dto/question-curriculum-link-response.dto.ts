import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionCurriculumLinkResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ format: 'uuid' })
  curriculumId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  canonicalLessonKey!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  authoringCurriculumVersionId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
