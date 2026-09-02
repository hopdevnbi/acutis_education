import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ClassLearningProgressQueryDto } from '../../learning-progress/dto/learning-progress-query.dto';

export class CatechistRosterQueryDto extends ClassLearningProgressQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  declare curriculumId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  declare canonicalLessonKey?: string;
}
