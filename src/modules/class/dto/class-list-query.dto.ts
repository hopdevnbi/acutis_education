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
  CLASS_LIST_DEFAULT_LIMIT,
  CLASS_LIST_DEFAULT_PAGE,
  CLASS_LIST_MAX_LIMIT,
  CLASS_SORT_DIRECTIONS,
  CLASS_SORT_FIELDS,
} from '../constants/class-list.constants';
import { ClassStatus } from '../enums/class-status.enum';

export class ClassListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: CLASS_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = CLASS_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: CLASS_LIST_MAX_LIMIT,
    default: CLASS_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CLASS_LIST_MAX_LIMIT)
  limit: number = CLASS_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: CLASS_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn([...CLASS_SORT_FIELDS])
  sortBy: (typeof CLASS_SORT_FIELDS)[number] = 'name';

  @ApiPropertyOptional({ enum: CLASS_SORT_DIRECTIONS, default: 'ASC' })
  @IsOptional()
  @IsIn([...CLASS_SORT_DIRECTIONS])
  sort: (typeof CLASS_SORT_DIRECTIONS)[number] = 'ASC';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  academicYearId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  catechismLevelId?: string;

  @ApiPropertyOptional({ enum: ClassStatus })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @ApiPropertyOptional({ description: 'Case-insensitive search across class code and name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
