import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ExamStatus } from '../enums/exam-status.enum';

export class UpdateExamStatusRequestDto {
  @ApiProperty({ enum: ExamStatus })
  @IsEnum(ExamStatus)
  status!: ExamStatus;
}
