import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { CLASS_SESSION_TITLE_MAX_LENGTH } from '../constants/class-operations.constants';

export class UpdateClassSessionDto {
  @ApiPropertyOptional({ maxLength: CLASS_SESSION_TITLE_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(CLASS_SESSION_TITLE_MAX_LENGTH)
  title?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;
}
