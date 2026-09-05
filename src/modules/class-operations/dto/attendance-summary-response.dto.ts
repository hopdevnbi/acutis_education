import { ApiProperty } from '@nestjs/swagger';

export class AttendanceSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ description: 'COMPLETED sessions where enrollment is on the frozen roster.' })
  totalSessions!: number;

  @ApiProperty()
  presentCount!: number;

  @ApiProperty()
  lateCount!: number;

  @ApiProperty()
  absentCount!: number;

  @ApiProperty()
  excusedCount!: number;

  @ApiProperty({ description: 'Roster rows with no attendance_records row.' })
  unmarkedCount!: number;

  @ApiProperty({
    description:
      'round(100 * (presentCount + lateCount) / totalSessions) when totalSessions > 0; else 0. LATE counts as present; EXCUSED does not.',
  })
  attendanceRatePercent!: number;
}
