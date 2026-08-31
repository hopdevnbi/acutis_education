import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { QUESTION_TAG_CODE_MAX_LENGTH } from '../utils/question-tag-code.util';
import { QUESTION_TAG_NAME_MAX_LENGTH } from '../utils/question-text.util';

export class UpdateQuestionTagRequestDto {
  @ApiPropertyOptional({ example: 'sacraments' })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_TAG_CODE_MAX_LENGTH)
  code?: string;

  @ApiPropertyOptional({ example: 'Bí tích' })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_TAG_NAME_MAX_LENGTH)
  name?: string;
}
