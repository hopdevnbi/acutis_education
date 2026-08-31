import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { QuestionDifficulty } from '../../question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../../question-bank/enums/question-type.enum';
import {
  PRACTICE_DEFAULT_QUESTION_COUNT,
  PRACTICE_MAX_QUESTION_COUNT,
  PRACTICE_MAX_TAG_FILTER_COUNT,
  PRACTICE_MIN_QUESTION_COUNT,
} from '../constants/practice-session.constants';

export class CreatePracticeSessionRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientRequestId?: string;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  curriculumId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  canonicalLessonKey?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRACTICE_MAX_TAG_FILTER_COUNT)
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRACTICE_MAX_TAG_FILTER_COUNT)
  tagCodes?: string[];

  @ApiPropertyOptional({ enum: QuestionType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(QuestionType, { each: true })
  questionTypes?: QuestionType[];

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({
    minimum: PRACTICE_MIN_QUESTION_COUNT,
    maximum: PRACTICE_MAX_QUESTION_COUNT,
    default: PRACTICE_DEFAULT_QUESTION_COUNT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PRACTICE_MIN_QUESTION_COUNT)
  @Max(PRACTICE_MAX_QUESTION_COUNT)
  questionCount?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;
}
