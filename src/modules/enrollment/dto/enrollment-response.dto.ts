import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class EnrollmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ format: 'uuid' })
  academicYearId!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  status!: EnrollmentStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  enrolledAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  leftAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
