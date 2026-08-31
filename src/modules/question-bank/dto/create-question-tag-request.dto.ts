import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { QUESTION_TAG_CODE_MAX_LENGTH } from '../utils/question-tag-code.util';
import { QUESTION_TAG_NAME_MAX_LENGTH } from '../utils/question-text.util';

export class CreateQuestionTagRequestDto {
  @ApiProperty({ example: 'sacraments' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(QUESTION_TAG_CODE_MAX_LENGTH)
  code!: string;

  @ApiProperty({ example: 'Bí tích' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(QUESTION_TAG_NAME_MAX_LENGTH)
  name!: string;
}
