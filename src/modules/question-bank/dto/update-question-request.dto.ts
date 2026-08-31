import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { QUESTION_CODE_MAX_LENGTH } from '../utils/question-code.util';

export class UpdateQuestionRequestDto {
  @ApiPropertyOptional({ example: 'baptism-basics', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_CODE_MAX_LENGTH)
  code?: string | null;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  sourceLocale?: string;
}
