import { ApiProperty } from '@nestjs/swagger';
import { StaffAttendanceHistoryItemDto } from './staff-attendance-history-item.dto';

export class StaffEnrollmentAttendanceHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty({ type: [StaffAttendanceHistoryItemDto] })
  items!: StaffAttendanceHistoryItemDto[];
}
