import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminTranslationEffectiveStatus } from '../enums/admin-translation-effective-status.enum';
import { LearnerTranslationReadStatus } from '../enums/learner-translation-read-status.enum';
import { TranslationJobStatus } from '../enums/translation-job-status.enum';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';

export class TranslationResourceSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: TranslationResourceType })
  resourceType!: TranslationResourceType;

  @ApiProperty({ format: 'uuid' })
  resourceId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parishId!: string | null;

  @ApiProperty()
  sourceLocale!: string;

  @ApiPropertyOptional({ nullable: true })
  targetLocale!: string | null;

  @ApiPropertyOptional({ enum: AdminTranslationEffectiveStatus, nullable: true })
  effectiveStatus!: AdminTranslationEffectiveStatus | null;

  @ApiPropertyOptional({ nullable: true })
  currentSourceContentHash!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  latestRevisionId!: string | null;

  @ApiPropertyOptional({ enum: TranslationRevisionStatus, nullable: true })
  latestRevisionStatus!: TranslationRevisionStatus | null;

  @ApiPropertyOptional({ nullable: true })
  latestRevisionNumber!: number | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TranslationResourceListResponseDto {
  @ApiProperty({ type: [TranslationResourceSummaryResponseDto] })
  items!: TranslationResourceSummaryResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class TranslationRevisionSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  revisionNumber!: number;

  @ApiProperty({ enum: TranslationRevisionStatus })
  status!: TranslationRevisionStatus;

  @ApiProperty()
  targetLocale!: string;

  @ApiProperty()
  sourceContentHash!: string;

  @ApiPropertyOptional({ nullable: true })
  sourceVersionKey!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  approvedByUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class TranslationJobSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  translationResourceId!: string;

  @ApiProperty()
  targetLocale!: string;

  @ApiProperty()
  sourceContentHash!: string;

  @ApiProperty({ enum: TranslationJobStatus })
  status!: TranslationJobStatus;

  @ApiProperty()
  attemptCount!: number;

  @ApiProperty()
  maxAttempts!: number;

  @ApiPropertyOptional({ nullable: true })
  lastErrorCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastErrorMessage!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TranslationResourceDetailResponseDto {
  @ApiProperty({ type: TranslationResourceSummaryResponseDto })
  resource!: TranslationResourceSummaryResponseDto;

  @ApiPropertyOptional({ nullable: true })
  targetLocale!: string | null;

  @ApiPropertyOptional({ enum: AdminTranslationEffectiveStatus, nullable: true })
  effectiveStatus!: AdminTranslationEffectiveStatus | null;

  @ApiPropertyOptional({ nullable: true })
  currentSourceContentHash!: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentSourceVersionKey!: string | null;

  @ApiPropertyOptional({ type: TranslationRevisionSummaryResponseDto, nullable: true })
  latestRevision!: TranslationRevisionSummaryResponseDto | null;

  @ApiPropertyOptional({ type: TranslationJobSummaryResponseDto, nullable: true })
  latestJob!: TranslationJobSummaryResponseDto | null;
}

export class TranslationRevisionDetailResponseDto {
  @ApiProperty({ type: TranslationRevisionSummaryResponseDto })
  revision!: TranslationRevisionSummaryResponseDto;

  @ApiProperty({ type: TranslationResourceSummaryResponseDto })
  resource!: TranslationResourceSummaryResponseDto;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload!: Record<string, unknown>;

  @ApiProperty({ enum: AdminTranslationEffectiveStatus })
  effectiveStatus!: AdminTranslationEffectiveStatus;

  @ApiProperty()
  isStale!: boolean;

  @ApiPropertyOptional({ nullable: true })
  currentSourceContentHash!: string | null;
}

export class TranslationJobListResponseDto {
  @ApiProperty({ type: [TranslationJobSummaryResponseDto] })
  items!: TranslationJobSummaryResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class RequestTranslationResponseDto {
  @ApiProperty({ enum: ['queued', 'existing_active', 'short_circuit_revision'] })
  kind!: 'queued' | 'existing_active' | 'short_circuit_revision';

  @ApiPropertyOptional({ type: TranslationJobSummaryResponseDto })
  job?: TranslationJobSummaryResponseDto;

  @ApiPropertyOptional({ type: TranslationRevisionSummaryResponseDto })
  revision?: TranslationRevisionSummaryResponseDto;
}

export class BulkTranslationResponseDto {
  @ApiProperty()
  queuedCount!: number;

  @ApiProperty()
  existingCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty({ type: [RequestTranslationResponseDto] })
  results!: RequestTranslationResponseDto[];
}

export class LocalizationPreviewResponseDto {
  @ApiProperty({ type: TranslationResourceSummaryResponseDto })
  resource!: TranslationResourceSummaryResponseDto;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  requestedLocale!: string | null;

  @ApiProperty()
  resolvedLocale!: string;

  @ApiProperty()
  sourceLocale!: string;

  @ApiProperty({ enum: LearnerTranslationReadStatus })
  translationStatus!: LearnerTranslationReadStatus;

  @ApiProperty()
  isFallback!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  translationRevisionId!: string | null;

  @ApiProperty()
  sourceContentHash!: string;
}
