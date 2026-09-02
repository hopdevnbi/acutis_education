import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReplaceExamVersionQuestionsRequestDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  questionIds!: string[];
}

export class ExamVersionQuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  questionVersionId!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: string;
}

export class ExamVersionQuestionListResponseDto {
  @ApiProperty({ type: [ExamVersionQuestionResponseDto] })
  items!: ExamVersionQuestionResponseDto[];
}
