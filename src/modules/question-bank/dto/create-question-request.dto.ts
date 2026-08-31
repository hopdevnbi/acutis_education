import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { QUESTION_CODE_MAX_LENGTH } from '../utils/question-code.util';
import { CreateQuestionDraftRequestDto } from './create-question-draft-request.dto';

export class CreateQuestionRequestDto {
  @ApiPropertyOptional({ example: 'baptism-basics', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_CODE_MAX_LENGTH)
  code?: string | null;

  @ApiProperty({
    example: 'vi-VN',
    description: 'BCP 47-like source locale for question lineage.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  sourceLocale!: string;

  @ApiProperty({ type: CreateQuestionDraftRequestDto })
  @ValidateNested()
  @Type(() => CreateQuestionDraftRequestDto)
  draft!: CreateQuestionDraftRequestDto;
}
