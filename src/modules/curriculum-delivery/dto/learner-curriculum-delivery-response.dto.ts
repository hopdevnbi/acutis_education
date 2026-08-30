import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ContentDocumentV1 } from '../../learning-content/interfaces/learning-content.interface';
import type { LearnerTranslationStatus } from '../interfaces/curriculum-delivery.interface';

export class LearnerCurriculumSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'vi-VN' })
  sourceLocale!: string;
}

export class LearnerCurriculumVersionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  versionNumber!: number;
}

export class LearnerLessonSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  canonicalLessonKey!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  estimatedDurationMinutes!: number | null;
}

export class LearnerTopicTreeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [LearnerLessonSummaryDto] })
  lessons!: LearnerLessonSummaryDto[];
}

export class LearnerCurriculumTreeResponseDto {
  @ApiProperty({ type: LearnerCurriculumSummaryDto })
  curriculum!: LearnerCurriculumSummaryDto;

  @ApiProperty({ type: LearnerCurriculumVersionSummaryDto })
  version!: LearnerCurriculumVersionSummaryDto;

  @ApiProperty({ type: [LearnerTopicTreeDto] })
  topics!: LearnerTopicTreeDto[];
}

export class LearnerLessonContentResponseDto {
  @ApiProperty()
  lessonId!: string;

  @ApiProperty()
  canonicalLessonKey!: string;

  @ApiProperty()
  curriculumVersionId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty({ example: 'vi-VN' })
  sourceLocale!: string;

  @ApiProperty({ example: 'vi-VN' })
  resolvedLocale!: string;

  @ApiProperty({ example: false })
  isFallback!: false;

  @ApiProperty({ enum: ['SOURCE'] })
  translationStatus!: LearnerTranslationStatus;

  @ApiPropertyOptional({ nullable: true })
  requestedLocale!: string | null;

  @ApiProperty()
  contentSchemaVersion!: number;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  document!: ContentDocumentV1;
}
