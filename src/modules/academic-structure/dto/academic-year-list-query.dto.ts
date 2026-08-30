import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  ACADEMIC_STRUCTURE_LIST_DEFAULT_LIMIT,
  ACADEMIC_STRUCTURE_LIST_DEFAULT_PAGE,
  ACADEMIC_STRUCTURE_LIST_MAX_LIMIT,
  ACADEMIC_STRUCTURE_SORT_DIRECTIONS,
  ACADEMIC_YEAR_SORT_FIELDS,
} from '../constants/academic-structure-list.constants';
import { AcademicYearStatus } from '../enums/academic-year-status.enum';

export class AcademicYearListQueryDto {
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

  @ApiPropertyOptional({ enum: ACADEMIC_YEAR_SORT_FIELDS, default: 'startDate' })
  @IsOptional()
  @IsIn([...ACADEMIC_YEAR_SORT_FIELDS])
  sortBy: (typeof ACADEMIC_YEAR_SORT_FIELDS)[number] = 'startDate';

  @ApiPropertyOptional({ enum: ACADEMIC_STRUCTURE_SORT_DIRECTIONS, default: 'DESC' })
  @IsOptional()
  @IsIn([...ACADEMIC_STRUCTURE_SORT_DIRECTIONS])
  sort: (typeof ACADEMIC_STRUCTURE_SORT_DIRECTIONS)[number] = 'DESC';

  @ApiPropertyOptional({ enum: AcademicYearStatus })
  @IsOptional()
  @IsEnum(AcademicYearStatus)
  status?: AcademicYearStatus;

  @ApiPropertyOptional({ description: 'Case-insensitive search across academic year name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
