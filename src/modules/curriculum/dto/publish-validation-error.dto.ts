import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CurriculumPublishValidationIssueDto {
  @ApiProperty({ example: 'CONTENT_MISSING' })
  code!: string;

  @ApiProperty({ example: 'Lesson content is missing.' })
  message!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  resourceId?: string;

  @ApiPropertyOptional({ example: 'lessons/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/content' })
  path?: string;
}

export class CurriculumPublishValidationErrorDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [CurriculumPublishValidationIssueDto] })
  issues!: CurriculumPublishValidationIssueDto[];
}
