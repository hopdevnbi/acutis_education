import { ApiProperty } from '@nestjs/swagger';
import { AcademicYearStatus } from '../enums/academic-year-status.enum';

export class AcademicYearResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ example: '2026-2027' })
  name!: string;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  startDate!: string;

  @ApiProperty({ example: '2027-06-30', format: 'date' })
  endDate!: string;

  @ApiProperty({ enum: AcademicYearStatus })
  status!: AcademicYearStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
