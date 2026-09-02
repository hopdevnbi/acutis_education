import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { LearningProgressQueryDto } from '../../learning-progress/dto/learning-progress-query.dto';

export class ParentEnrollmentProgressQueryDto extends LearningProgressQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  declare curriculumId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  declare canonicalLessonKey?: string;
}
