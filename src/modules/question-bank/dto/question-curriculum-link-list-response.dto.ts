import { ApiProperty } from '@nestjs/swagger';
import { QuestionCurriculumLinkResponseDto } from './question-curriculum-link-response.dto';

export class QuestionCurriculumLinkListResponseDto {
  @ApiProperty({ type: [QuestionCurriculumLinkResponseDto] })
  items!: QuestionCurriculumLinkResponseDto[];
}
