import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  PARISH_LIST_DEFAULT_LIMIT,
  PARISH_LIST_DEFAULT_PAGE,
  PARISH_LIST_MAX_LIMIT,
  PARISH_SORT_DIRECTIONS,
  PARISH_SORT_FIELDS,
} from '../constants/parish-list.constants';
import { ParishStatus } from '../enums/parish-status.enum';

export class ParishListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: PARISH_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PARISH_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PARISH_LIST_MAX_LIMIT,
    default: PARISH_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PARISH_LIST_MAX_LIMIT)
  limit: number = PARISH_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: PARISH_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn([...PARISH_SORT_FIELDS])
  sortBy: (typeof PARISH_SORT_FIELDS)[number] = 'name';

  @ApiPropertyOptional({ enum: PARISH_SORT_DIRECTIONS, default: 'ASC' })
  @IsOptional()
  @IsIn([...PARISH_SORT_DIRECTIONS])
  sort: (typeof PARISH_SORT_DIRECTIONS)[number] = 'ASC';

  @ApiPropertyOptional({ enum: ParishStatus })
  @IsOptional()
  @IsEnum(ParishStatus)
  status?: ParishStatus;

  @ApiPropertyOptional({ description: 'Case-insensitive search across parish code and name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
