import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentResponseDto } from './enrollment-response.dto';

export class EnrollmentListResponseDto {
  @ApiProperty({ type: [EnrollmentResponseDto] })
  items!: EnrollmentResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
