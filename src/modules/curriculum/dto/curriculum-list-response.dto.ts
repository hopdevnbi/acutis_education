import { ApiProperty } from '@nestjs/swagger';
import { CurriculumResponseDto } from './curriculum-response.dto';

export class CurriculumListResponseDto {
  @ApiProperty({ type: [CurriculumResponseDto] })
  items!: CurriculumResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
