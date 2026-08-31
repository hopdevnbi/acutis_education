import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { QuestionTagStatus } from '../enums/question-tag-status.enum';

export class UpdateQuestionTagStatusRequestDto {
  @ApiProperty({ enum: QuestionTagStatus })
  @IsEnum(QuestionTagStatus)
  status!: QuestionTagStatus;
}
