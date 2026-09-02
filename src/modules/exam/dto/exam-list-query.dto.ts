import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  EXAM_LIST_DEFAULT_LIMIT,
  EXAM_LIST_DEFAULT_PAGE,
  EXAM_LIST_MAX_LIMIT,
  EXAM_SORT_DIRECTIONS,
  EXAM_SORT_FIELDS,
} from '../constants/exam-list.constants';
import { ExamStatus } from '../enums/exam-status.enum';

export class ExamListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: EXAM_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = EXAM_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: EXAM_LIST_MAX_LIMIT,
    default: EXAM_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(EXAM_LIST_MAX_LIMIT)
  limit: number = EXAM_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: EXAM_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsIn([...EXAM_SORT_FIELDS])
  sortBy: (typeof EXAM_SORT_FIELDS)[number] = 'code';

  @ApiPropertyOptional({ enum: EXAM_SORT_DIRECTIONS, default: 'ASC' })
  @IsOptional()
  @IsIn([...EXAM_SORT_DIRECTIONS])
  sort: (typeof EXAM_SORT_DIRECTIONS)[number] = 'ASC';

  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional()
  @IsIn([ExamStatus.Active, ExamStatus.Inactive])
  status?: ExamStatus;

  @ApiPropertyOptional({ description: 'Case-insensitive search across exam code.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
