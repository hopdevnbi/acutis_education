import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ENROLLMENT_LIST_DEFAULT_LIMIT,
  ENROLLMENT_LIST_DEFAULT_PAGE,
  ENROLLMENT_LIST_MAX_LIMIT,
  ENROLLMENT_SORT_DIRECTIONS,
  ENROLLMENT_SORT_FIELDS,
} from '../constants/enrollment.constants';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class EnrollmentListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: ENROLLMENT_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = ENROLLMENT_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ENROLLMENT_LIST_MAX_LIMIT,
    default: ENROLLMENT_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ENROLLMENT_LIST_MAX_LIMIT)
  limit: number = ENROLLMENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: ENROLLMENT_SORT_FIELDS, default: 'enrolledAt' })
  @IsOptional()
  @IsIn([...ENROLLMENT_SORT_FIELDS])
  sortBy: (typeof ENROLLMENT_SORT_FIELDS)[number] = 'enrolledAt';

  @ApiPropertyOptional({ enum: ENROLLMENT_SORT_DIRECTIONS, default: 'DESC' })
  @IsOptional()
  @IsIn([...ENROLLMENT_SORT_DIRECTIONS])
  sort: (typeof ENROLLMENT_SORT_DIRECTIONS)[number] = 'DESC';

  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
