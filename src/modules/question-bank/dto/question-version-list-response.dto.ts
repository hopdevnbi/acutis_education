import { ApiProperty } from '@nestjs/swagger';
import { QuestionVersionResponseDto } from './question-version-response.dto';

export class QuestionVersionListResponseDto {
  @ApiProperty({ type: [QuestionVersionResponseDto] })
  items!: QuestionVersionResponseDto[];
}
