import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { QuestionStatus } from '../enums/question-status.enum';

export class UpdateQuestionStatusRequestDto {
  @ApiProperty({ enum: QuestionStatus })
  @IsEnum(QuestionStatus)
  status!: QuestionStatus;
}
