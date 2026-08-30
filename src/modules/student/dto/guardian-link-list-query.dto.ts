import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  GUARDIAN_LINK_LIST_DEFAULT_LIMIT,
  GUARDIAN_LINK_LIST_DEFAULT_PAGE,
  GUARDIAN_LINK_LIST_MAX_LIMIT,
} from '../constants/student.constants';

export class GuardianLinkListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: GUARDIAN_LINK_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = GUARDIAN_LINK_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: GUARDIAN_LINK_LIST_MAX_LIMIT,
    default: GUARDIAN_LINK_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(GUARDIAN_LINK_LIST_MAX_LIMIT)
  limit: number = GUARDIAN_LINK_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeEnded: boolean = false;
}
