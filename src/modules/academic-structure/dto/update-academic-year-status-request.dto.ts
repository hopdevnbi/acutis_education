import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AcademicYearStatus } from '../enums/academic-year-status.enum';

export class UpdateAcademicYearStatusRequestDto {
  @ApiProperty({ enum: AcademicYearStatus, example: AcademicYearStatus.Active })
  @IsEnum(AcademicYearStatus)
  status!: AcademicYearStatus;
}
