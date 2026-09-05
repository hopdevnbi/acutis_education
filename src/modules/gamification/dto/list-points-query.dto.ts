import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  POINTS_LIST_DEFAULT_LIMIT,
  POINTS_LIST_DEFAULT_PAGE,
  POINTS_LIST_MAX_LIMIT,
} from '../constants/gamification.constants';

export class ListPointsQueryDto {
  @ApiPropertyOptional({ default: POINTS_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = POINTS_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: POINTS_LIST_DEFAULT_LIMIT,
    maximum: POINTS_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(POINTS_LIST_MAX_LIMIT)
  limit: number = POINTS_LIST_DEFAULT_LIMIT;
}
