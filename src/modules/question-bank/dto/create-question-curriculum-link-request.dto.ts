import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateQuestionCurriculumLinkRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  curriculumId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  canonicalLessonKey?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  authoringCurriculumVersionId?: string | null;
}
