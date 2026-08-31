import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';

export class QuestionVersionListQueryDto {
  @ApiPropertyOptional({ enum: QuestionVersionStatus })
  @IsOptional()
  @IsEnum(QuestionVersionStatus)
  status?: QuestionVersionStatus;
}
