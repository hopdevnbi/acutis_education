import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  QUESTION_LIST_DEFAULT_LIMIT,
  QUESTION_LIST_DEFAULT_PAGE,
  QUESTION_LIST_MAX_LIMIT,
  QUESTION_SORT_DIRECTIONS,
  QUESTION_SORT_FIELDS,
} from '../constants/question-list.constants';
import { QuestionStatus } from '../enums/question-status.enum';

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

  @ApiPropertyOptional({ enum: QUESTION_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn([...QUESTION_SORT_FIELDS])
  sortBy: (typeof QUESTION_SORT_FIELDS)[number] = 'createdAt';

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

  @ApiPropertyOptional({ description: 'Case-insensitive search across question code.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
