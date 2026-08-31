import { ApiProperty } from '@nestjs/swagger';
import { QuestionListItemResponseDto } from './question-list-item-response.dto';

export class QuestionListResponseDto {
  @ApiProperty({ type: [QuestionListItemResponseDto] })
  items!: QuestionListItemResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
