import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  QUESTION_LIST_DEFAULT_LIMIT,
  QUESTION_LIST_DEFAULT_PAGE,
  QUESTION_LIST_MAX_LIMIT,
  QUESTION_SORT_DIRECTIONS,
  QUESTION_SORT_FIELDS,
} from '../constants/question-list.constants';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';

export class QuestionListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: QUESTION_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = QUESTION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: QUESTION_LIST_MAX_LIMIT,
    default: QUESTION_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(QUESTION_LIST_MAX_LIMIT)
  limit: number = QUESTION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: QUESTION_SORT_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsIn([...QUESTION_SORT_FIELDS])
  sortBy: (typeof QUESTION_SORT_FIELDS)[number] = 'updatedAt';

  @ApiPropertyOptional({ enum: QUESTION_SORT_DIRECTIONS, default: 'DESC' })
  @IsOptional()
  @IsIn([...QUESTION_SORT_DIRECTIONS])
  sort: (typeof QUESTION_SORT_DIRECTIONS)[number] = 'DESC';

  @ApiPropertyOptional({ enum: QuestionStatus })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  sourceLocale?: string;

  @ApiPropertyOptional({ description: 'Exact match on question code.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({
    description:
      'Unicode-aware search across question code and effective-version prompt (DRAFT if present, else current PUBLISHED).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: QuestionVersionStatus })
  @IsOptional()
  @IsEnum(QuestionVersionStatus)
  versionStatus?: QuestionVersionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hasDraft?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hasPublished?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  tagId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tagCode?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  curriculumId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Requires curriculumId when supplied.',
  })
  @IsOptional()
  @IsUUID('4')
  canonicalLessonKey?: string;
}
