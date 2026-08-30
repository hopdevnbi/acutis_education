import { ApiProperty } from '@nestjs/swagger';
import { LessonResponseDto } from './lesson-response.dto';

export class LessonListResponseDto {
  @ApiProperty({ type: [LessonResponseDto] })
  items!: LessonResponseDto[];
}
