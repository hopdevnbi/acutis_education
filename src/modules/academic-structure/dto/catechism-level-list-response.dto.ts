import { ApiProperty } from '@nestjs/swagger';
import { CatechismLevelResponseDto } from './catechism-level-response.dto';

export class CatechismLevelListResponseDto {
  @ApiProperty({ type: [CatechismLevelResponseDto] })
  items!: CatechismLevelResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
