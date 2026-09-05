import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CmsEntryStatus, CmsEntryType, CmsScopeType } from '../enums/cms.enums';

export const CMS_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCmsEntryDto {
  @ApiProperty({ enum: CmsEntryType, example: CmsEntryType.Article })
  @IsEnum(CmsEntryType)
  type!: CmsEntryType;

  @ApiProperty({ enum: CmsScopeType, example: CmsScopeType.Global })
  @IsEnum(CmsScopeType)
  scopeType!: CmsScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, example: null })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiProperty({
    example: 'parish-anniversary-celebration',
    description: 'Lowercase alphanumeric kebab slug',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(CMS_SLUG_REGEX, {
    message: 'Slug must contain only lowercase alphanumeric characters separated by single hyphens.',
  })
  slug!: string;

  @ApiProperty({ example: '50th Parish Anniversary Celebration', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Brief summary of the celebration events.', maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @ApiProperty({ example: 'Full article body content...', maxLength: 65536 })
  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  body!: string;

  @ApiPropertyOptional({ example: 'vi-VN', default: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  coverMediaAssetId?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'If set to a future UTC date, entry status will become SCHEDULED.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;
}

export class UpdateCmsEntryDto {
  @ApiPropertyOptional({ enum: CmsEntryType })
  @IsOptional()
  @IsEnum(CmsEntryType)
  type?: CmsEntryType;

  @ApiPropertyOptional({ enum: CmsScopeType })
  @IsOptional()
  @IsEnum(CmsScopeType)
  scopeType?: CmsScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Matches(CMS_SLUG_REGEX, {
    message: 'Slug must contain only lowercase alphanumeric characters separated by single hyphens.',
  })
  slug?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @ApiPropertyOptional({ maxLength: 65536 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  body?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  coverMediaAssetId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;
}

export class CmsPublicListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({ enum: CmsEntryType })
  @IsOptional()
  @IsEnum(CmsEntryType)
  type?: CmsEntryType;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ description: 'Filter only featured entries' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by parish scope (requires user access)' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string;
}

export class CmsPublicDetailQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target parish ID for parish-scoped slug lookup. If omitted, defaults to GLOBAL scope.',
  })
  @IsOptional()
  @IsUUID('4')
  parishId?: string;
}

export class CmsEntryListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CmsEntryType })
  type!: CmsEntryType;

  @ApiProperty({ enum: CmsScopeType })
  scopeType!: CmsScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parishId!: string | null;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  locale!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  coverMediaAssetId!: string | null;

  @ApiProperty()
  isFeatured!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  publishedAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  expiresAt!: string | null;
}

export class CmsPublicListResponseDto {
  @ApiProperty({ type: [CmsEntryListItemDto] })
  items!: CmsEntryListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class CmsEntryDetailDto extends CmsEntryListItemDto {
  @ApiProperty({ description: 'Full body content (markdown / rich text)' })
  body!: string;
}

export class CmsEntryAdminListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({ enum: CmsEntryStatus })
  @IsOptional()
  @IsEnum(CmsEntryStatus)
  status?: CmsEntryStatus;

  @ApiPropertyOptional({ enum: CmsEntryType })
  @IsOptional()
  @IsEnum(CmsEntryType)
  type?: CmsEntryType;

  @ApiPropertyOptional({ enum: CmsScopeType })
  @IsOptional()
  @IsEnum(CmsScopeType)
  scopeType?: CmsScopeType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ description: 'Partial search in title or slug' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CmsEntryAdminResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CmsEntryType })
  type!: CmsEntryType;

  @ApiProperty({ enum: CmsScopeType })
  scopeType!: CmsScopeType;

  @ApiProperty({ description: 'Internal non-null composite uniqueness key' })
  scopeKey!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parishId!: string | null;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  locale!: string;

  @ApiProperty({ enum: CmsEntryStatus })
  status!: CmsEntryStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  coverMediaAssetId!: string | null;

  @ApiProperty()
  isFeatured!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  scheduledFor!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ format: 'uuid' })
  updatedByUserId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class CmsEntryAdminListResponseDto {
  @ApiProperty({ type: [CmsEntryAdminResponseDto] })
  items!: CmsEntryAdminResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
