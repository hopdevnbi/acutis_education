import { ApiProperty } from '@nestjs/swagger';

export class QuestionTagLinkResponseDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  tagId!: string;
}
