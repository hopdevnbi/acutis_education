import { ApiProperty } from '@nestjs/swagger';
import { AcademicYearResponseDto } from './academic-year-response.dto';

export class AcademicYearListResponseDto {
  @ApiProperty({ type: [AcademicYearResponseDto] })
  items!: AcademicYearResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
