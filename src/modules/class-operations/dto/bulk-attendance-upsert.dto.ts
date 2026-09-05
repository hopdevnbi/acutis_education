import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ATTENDANCE_NOTE_MAX_LENGTH } from '../constants/class-operations.constants';
import { AttendanceStatus } from '../enums/attendance-status.enum';

export class AttendanceRecordInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  enrollmentId!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiPropertyOptional({ maxLength: ATTENDANCE_NOTE_MAX_LENGTH, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(ATTENDANCE_NOTE_MAX_LENGTH)
  note?: string | null;
}

export class BulkAttendanceUpsertDto {
  @ApiProperty({ type: [AttendanceRecordInputDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordInputDto)
  records!: AttendanceRecordInputDto[];
}
