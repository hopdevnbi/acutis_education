import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamPublishValidationIssueDto {
  @ApiProperty({ example: 'NO_QUESTIONS' })
  code!: string;

  @ApiProperty({ example: 'Exam version must contain at least one question.' })
  message!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  resourceId?: string;

  @ApiPropertyOptional({ example: 'questions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })
  path?: string;
}

export class ExamPublishValidationErrorDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [ExamPublishValidationIssueDto] })
  issues!: ExamPublishValidationIssueDto[];
}
