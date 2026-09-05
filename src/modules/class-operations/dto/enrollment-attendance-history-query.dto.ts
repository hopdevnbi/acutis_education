import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_LIMIT,
  ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_PAGE,
  ENROLLMENT_ATTENDANCE_HISTORY_MAX_LIMIT,
} from '../constants/class-operations.constants';

export class EnrollmentAttendanceHistoryQueryDto {
  @ApiPropertyOptional({ default: ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_LIMIT,
    maximum: ENROLLMENT_ATTENDANCE_HISTORY_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ENROLLMENT_ATTENDANCE_HISTORY_MAX_LIMIT)
  limit: number = ENROLLMENT_ATTENDANCE_HISTORY_DEFAULT_LIMIT;
}
