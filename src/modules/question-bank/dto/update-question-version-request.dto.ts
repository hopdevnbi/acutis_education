import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';
import {
  QUESTION_EXPLANATION_MAX_LENGTH,
  QUESTION_INSTRUCTION_MAX_LENGTH,
  QUESTION_PROMPT_MAX_LENGTH,
} from '../utils/question-text.util';

export class UpdateQuestionVersionRequestDto {
  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ nullable: true, description: 'JSON string for prompt media references.' })
  @IsOptional()
  @IsString()
  promptMediaJson?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'JSON string for explanation media references.',
  })
  @IsOptional()
  @IsString()
  explanationMediaJson?: string | null;
}
