import { ApiProperty } from '@nestjs/swagger';
import { QuestionOptionResponseDto } from './question-option-response.dto';
import { QuestionVersionResponseDto } from './question-version-response.dto';

export class QuestionAuthoringResponseDto {
  @ApiProperty({ type: QuestionVersionResponseDto })
  version!: QuestionVersionResponseDto;

  @ApiProperty({ type: [QuestionOptionResponseDto] })
  options!: QuestionOptionResponseDto[];

  @ApiProperty({ type: [String], format: 'uuid' })
  correctOptionIds!: string[];
}
