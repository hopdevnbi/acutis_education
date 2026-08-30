import { ApiProperty } from '@nestjs/swagger';
import { ClassResponseDto } from './class-response.dto';

export class ClassListResponseDto {
  @ApiProperty({ type: [ClassResponseDto] })
  items!: ClassResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}
