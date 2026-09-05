import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  CLASS_SESSION_LIST_DEFAULT_LIMIT,
  CLASS_SESSION_LIST_DEFAULT_PAGE,
  CLASS_SESSION_LIST_MAX_LIMIT,
} from '../constants/class-operations.constants';
import { ClassSessionStatus } from '../enums/class-session-status.enum';

export class ListClassSessionsQueryDto {
  @ApiPropertyOptional({ default: CLASS_SESSION_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = CLASS_SESSION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: CLASS_SESSION_LIST_DEFAULT_LIMIT,
    maximum: CLASS_SESSION_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CLASS_SESSION_LIST_MAX_LIMIT)
  limit: number = CLASS_SESSION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: ClassSessionStatus })
  @IsOptional()
  @IsEnum(ClassSessionStatus)
  status?: ClassSessionStatus;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Filter startsAt >= from',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Filter startsAt <= to' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
