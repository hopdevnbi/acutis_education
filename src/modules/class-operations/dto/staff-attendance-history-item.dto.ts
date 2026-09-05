import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { ClassSessionStatus } from '../enums/class-session-status.enum';

export class StaffAttendanceHistoryItemDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ enum: ClassSessionStatus })
  sessionStatus!: string;

  @ApiPropertyOptional({
    enum: AttendanceStatus,
    nullable: true,
    description: 'Null means UNMARKED (no attendance_records row). Persistence enum is unchanged.',
  })
  attendanceStatus!: AttendanceStatus | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  note!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  markedAt!: Date | null;
}
