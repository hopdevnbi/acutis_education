import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { CLASS_SESSION_TITLE_MAX_LENGTH } from '../constants/class-operations.constants';

export class CreateClassSessionDto {
  @ApiProperty({ required: false, maxLength: CLASS_SESSION_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CLASS_SESSION_TITLE_MAX_LENGTH)
  title?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endsAt!: Date;
}
