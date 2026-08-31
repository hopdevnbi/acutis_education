import { ApiProperty } from '@nestjs/swagger';
import { QuestionTagResponseDto } from './question-tag-response.dto';

export class QuestionTagListResponseDto {
  @ApiProperty({ type: [QuestionTagResponseDto] })
  items!: QuestionTagResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
