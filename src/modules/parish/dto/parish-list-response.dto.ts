import { ApiProperty } from '@nestjs/swagger';
import { ParishResponseDto } from './parish-response.dto';

export class ParishListResponseDto {
  @ApiProperty({ type: [ParishResponseDto] })
  items!: ParishResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}
