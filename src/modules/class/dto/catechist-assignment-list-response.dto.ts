import { ApiProperty } from '@nestjs/swagger';
import { CatechistAssignmentResponseDto } from './catechist-assignment-response.dto';

export class CatechistAssignmentListResponseDto {
  @ApiProperty({ type: [CatechistAssignmentResponseDto] })
  items!: CatechistAssignmentResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
