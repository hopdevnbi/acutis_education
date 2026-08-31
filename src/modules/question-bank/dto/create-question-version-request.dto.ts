import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import {
  QUESTION_EXPLANATION_MAX_LENGTH,
  QUESTION_INSTRUCTION_MAX_LENGTH,
  QUESTION_PROMPT_MAX_LENGTH,
} from '../utils/question-text.util';

export class CreateQuestionVersionRequestDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiPropertyOptional({ example: 'What is the first sacrament?' })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_PROMPT_MAX_LENGTH)
  prompt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_INSTRUCTION_MAX_LENGTH)
  instruction?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_EXPLANATION_MAX_LENGTH)
  explanation?: string | null;

  @ApiPropertyOptional({ enum: QuestionDifficulty, nullable: true })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty | null;
}
