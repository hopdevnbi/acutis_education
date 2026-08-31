import { ApiProperty } from '@nestjs/swagger';
import { QuestionResponseDto } from './question-response.dto';
import { QuestionVersionResponseDto } from './question-version-response.dto';

export class CreateQuestionResponseDto {
  @ApiProperty({ type: QuestionResponseDto })
  question!: QuestionResponseDto;

  @ApiProperty({ type: QuestionVersionResponseDto })
  initialVersion!: QuestionVersionResponseDto;
}
