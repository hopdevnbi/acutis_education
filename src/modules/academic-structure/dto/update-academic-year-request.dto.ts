import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ACADEMIC_YEAR_NAME_MAX_LENGTH } from '../utils/academic-year-name.util';

export class UpdateAcademicYearRequestDto {
  @ApiPropertyOptional({ example: '2026-2027', maxLength: ACADEMIC_YEAR_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ACADEMIC_YEAR_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ example: '2026-09-01', format: 'date' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-06-30', format: 'date' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
}
