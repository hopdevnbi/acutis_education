import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ACADEMIC_YEAR_NAME_MAX_LENGTH } from '../utils/academic-year-name.util';

export class CreateAcademicYearRequestDto {
  @ApiProperty({ example: '2026-2027', maxLength: ACADEMIC_YEAR_NAME_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ACADEMIC_YEAR_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiProperty({ example: '2027-06-30', format: 'date' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;
}
