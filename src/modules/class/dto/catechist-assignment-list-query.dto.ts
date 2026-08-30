import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  CATECHIST_ASSIGNMENT_LIST_DEFAULT_LIMIT,
  CATECHIST_ASSIGNMENT_LIST_DEFAULT_PAGE,
  CATECHIST_ASSIGNMENT_LIST_MAX_LIMIT,
} from '../constants/class-catechist-assignment.constants';

export class CatechistAssignmentListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: CATECHIST_ASSIGNMENT_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = CATECHIST_ASSIGNMENT_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: CATECHIST_ASSIGNMENT_LIST_MAX_LIMIT,
    default: CATECHIST_ASSIGNMENT_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CATECHIST_ASSIGNMENT_LIST_MAX_LIMIT)
  limit: number = CATECHIST_ASSIGNMENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeEnded: boolean = false;
}
