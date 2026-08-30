import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  ACADEMIC_STRUCTURE_LIST_DEFAULT_LIMIT,
  ACADEMIC_STRUCTURE_LIST_DEFAULT_PAGE,
  ACADEMIC_STRUCTURE_LIST_MAX_LIMIT,
  ACADEMIC_STRUCTURE_SORT_DIRECTIONS,
  CATECHISM_LEVEL_SORT_FIELDS,
} from '../constants/academic-structure-list.constants';
import { CatechismLevelStatus } from '../enums/catechism-level-status.enum';

export class CatechismLevelListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: ACADEMIC_STRUCTURE_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = ACADEMIC_STRUCTURE_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ACADEMIC_STRUCTURE_LIST_MAX_LIMIT,
    default: ACADEMIC_STRUCTURE_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ACADEMIC_STRUCTURE_LIST_MAX_LIMIT)
  limit: number = ACADEMIC_STRUCTURE_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: CATECHISM_LEVEL_SORT_FIELDS, default: 'sortOrder' })
  @IsOptional()
  @IsIn([...CATECHISM_LEVEL_SORT_FIELDS])
  sortBy: (typeof CATECHISM_LEVEL_SORT_FIELDS)[number] = 'sortOrder';

  @ApiPropertyOptional({ enum: ACADEMIC_STRUCTURE_SORT_DIRECTIONS, default: 'ASC' })
  @IsOptional()
  @IsIn([...ACADEMIC_STRUCTURE_SORT_DIRECTIONS])
  sort: (typeof ACADEMIC_STRUCTURE_SORT_DIRECTIONS)[number] = 'ASC';

  @ApiPropertyOptional({ enum: CatechismLevelStatus })
  @IsOptional()
  @IsEnum(CatechismLevelStatus)
  status?: CatechismLevelStatus;

  @ApiPropertyOptional({
    description: 'Case-insensitive search across catechism level code and name.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
