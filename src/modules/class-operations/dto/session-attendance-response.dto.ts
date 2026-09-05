import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { ClassSessionResponseDto } from './class-session-response.dto';

export class AttendanceRosterItemDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, nullable: true })
  status!: AttendanceStatus | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  note!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  markedAt!: Date | null;
}

export class SessionAttendanceResponseDto {
  @ApiProperty({ type: ClassSessionResponseDto })
  session!: ClassSessionResponseDto;

  @ApiProperty()
  rosterCount!: number;

  @ApiProperty()
  markedCount!: number;

  @ApiProperty()
  unmarkedCount!: number;

  @ApiProperty({ type: [AttendanceRosterItemDto] })
  items!: AttendanceRosterItemDto[];
}
