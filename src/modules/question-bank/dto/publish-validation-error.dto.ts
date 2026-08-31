import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionPublishValidationIssueDto {
  @ApiProperty({ example: 'PROMPT_REQUIRED' })
  code!: string;

  @ApiProperty({ example: 'Question prompt is required before publish.' })
  message!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  resourceId?: string;

  @ApiPropertyOptional({ example: 'prompt' })
  path?: string;
}

export class QuestionPublishValidationErrorDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [QuestionPublishValidationIssueDto] })
  issues!: QuestionPublishValidationIssueDto[];
}
