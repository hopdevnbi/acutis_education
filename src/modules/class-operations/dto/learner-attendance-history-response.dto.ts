import { ApiProperty } from '@nestjs/swagger';
import { LearnerAttendanceHistoryItemDto } from './learner-attendance-history-item.dto';

export class LearnerAttendanceHistoryResponseDto {
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

  @ApiProperty({ type: [LearnerAttendanceHistoryItemDto] })
  items!: LearnerAttendanceHistoryItemDto[];
}
