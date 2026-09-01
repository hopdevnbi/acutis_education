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

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;
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

  @ApiPropertyOptional({ nullable: true })
  requestedLocale!: string | null;

  @ApiProperty({ example: 'vi-VN' })
  resolvedLocale!: string;

  @ApiProperty({ example: 'vi-VN' })
  sourceLocale!: string;

  @ApiProperty({ enum: ['SOURCE', 'APPROVED', 'MISSING', 'STALE'] })
  translationStatus!: LearnerTranslationStatus;

  @ApiProperty({ example: false })
  isFallback!: boolean;
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
  isFallback!: boolean;

  @ApiProperty({ enum: ['SOURCE', 'APPROVED', 'MISSING', 'STALE'] })
  translationStatus!: LearnerTranslationStatus;

  @ApiPropertyOptional({ nullable: true })
  requestedLocale!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  translationRevisionId!: string | null;

  @ApiProperty()
  sourceContentHash!: string;

  @ApiProperty()
  contentSchemaVersion!: number;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  document!: ContentDocumentV1;
}
