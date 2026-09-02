import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_LIMIT,
  FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_PAGE,
  FAMILY_PORTAL_CATECHIST_CLASSES_MAX_LIMIT,
} from '../constants/family-portal.constants';

export class CatechistClassListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: FAMILY_PORTAL_CATECHIST_CLASSES_MAX_LIMIT,
    default: FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FAMILY_PORTAL_CATECHIST_CLASSES_MAX_LIMIT)
  limit?: number = FAMILY_PORTAL_CATECHIST_CLASSES_DEFAULT_LIMIT;
}
