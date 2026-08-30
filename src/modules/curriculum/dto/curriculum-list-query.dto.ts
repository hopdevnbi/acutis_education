import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
  CURRICULUM_LIST_DEFAULT_LIMIT,
  CURRICULUM_LIST_DEFAULT_PAGE,
  CURRICULUM_LIST_MAX_LIMIT,
  CURRICULUM_SORT_DIRECTIONS,
  CURRICULUM_SORT_FIELDS,
} from '../constants/curriculum-list.constants';
import { CurriculumStatus } from '../enums/curriculum-status.enum';

export class CurriculumListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: CURRICULUM_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = CURRICULUM_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: CURRICULUM_LIST_MAX_LIMIT,
    default: CURRICULUM_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CURRICULUM_LIST_MAX_LIMIT)
  limit: number = CURRICULUM_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: CURRICULUM_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn([...CURRICULUM_SORT_FIELDS])
  sortBy: (typeof CURRICULUM_SORT_FIELDS)[number] = 'name';

  @ApiPropertyOptional({ enum: CURRICULUM_SORT_DIRECTIONS, default: 'ASC' })
  @IsOptional()
  @IsIn([...CURRICULUM_SORT_DIRECTIONS])
  sort: (typeof CURRICULUM_SORT_DIRECTIONS)[number] = 'ASC';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  catechismLevelId?: string;

  @ApiPropertyOptional({ enum: CurriculumStatus })
  @IsOptional()
  @IsEnum(CurriculumStatus)
  status?: CurriculumStatus;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  sourceLocale?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive search across curriculum code and name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
