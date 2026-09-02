import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LOCALIZATION_BULK_MAX_RESOURCES,
  LOCALIZATION_LIST_DEFAULT_LIMIT,
  LOCALIZATION_LIST_DEFAULT_PAGE,
  LOCALIZATION_LIST_MAX_LIMIT,
} from '../constants/localization-admin.constants';
import { AdminTranslationEffectiveStatus } from '../enums/admin-translation-effective-status.enum';
import { TranslationJobStatus } from '../enums/translation-job-status.enum';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';

export class LocalizationResourceListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: LOCALIZATION_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = LOCALIZATION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: LOCALIZATION_LIST_MAX_LIMIT,
    default: LOCALIZATION_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LOCALIZATION_LIST_MAX_LIMIT)
  limit: number = LOCALIZATION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: TranslationResourceType })
  @IsOptional()
  @IsEnum(TranslationResourceType)
  resourceType?: TranslationResourceType;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  sourceLocale?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetLocale?: string;

  @ApiPropertyOptional({ enum: AdminTranslationEffectiveStatus })
  @IsOptional()
  @IsEnum(AdminTranslationEffectiveStatus)
  translationStatus?: AdminTranslationEffectiveStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string;
}

export class SyncTranslationResourceRequestDto {
  @ApiProperty({ enum: TranslationResourceType })
  @IsEnum(TranslationResourceType)
  resourceType!: TranslationResourceType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  resourceId!: string;
}

export class RequestTranslationRequestDto {
  @ApiProperty({ example: 'en-US' })
  @IsString()
  @MaxLength(32)
  targetLocale!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerId?: string;
}

export class BulkTranslationRequestDto {
  @ApiProperty({ type: [String], maxItems: LOCALIZATION_BULK_MAX_RESOURCES })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LOCALIZATION_BULK_MAX_RESOURCES)
  @IsUUID('4', { each: true })
  translationResourceIds!: string[];

  @ApiProperty({ example: 'en-US' })
  @IsString()
  @MaxLength(32)
  targetLocale!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerId?: string;
}

export class ReviewTranslationRevisionRequestDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class LocalizationJobListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: LOCALIZATION_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = LOCALIZATION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: LOCALIZATION_LIST_MAX_LIMIT,
    default: LOCALIZATION_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LOCALIZATION_LIST_MAX_LIMIT)
  limit: number = LOCALIZATION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  translationResourceId?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetLocale?: string;

  @ApiPropertyOptional({ enum: TranslationJobStatus })
  @IsOptional()
  @IsEnum(TranslationJobStatus)
  status?: TranslationJobStatus;
}

export class LocalizationPreviewQueryDto {
  @ApiProperty({ example: 'en-US' })
  @IsString()
  @MaxLength(32)
  locale!: string;
}

export class LocalizationResourceDetailQueryDto {
  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetLocale?: string;
}
