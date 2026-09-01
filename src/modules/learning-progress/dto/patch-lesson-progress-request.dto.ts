import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { LessonProgressStatus } from '../enums/lesson-progress-status.enum';

export class PatchLessonProgressRequestDto {
  @ApiProperty({ enum: [LessonProgressStatus.InProgress, LessonProgressStatus.Completed] })
  @IsIn([LessonProgressStatus.InProgress, LessonProgressStatus.Completed])
  status!: LessonProgressStatus.InProgress | LessonProgressStatus.Completed;
}
