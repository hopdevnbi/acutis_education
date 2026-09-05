import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../enums/announcement.enums';

export class AnnouncementTargetInputDto {
  @ApiProperty({ enum: CommunicationTargetType, example: CommunicationTargetType.Parish })
  @IsEnum(CommunicationTargetType)
  targetType!: CommunicationTargetType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  classId?: string | null;

  @ApiPropertyOptional({ example: 'CATECHIST', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  roleCode?: string | null;
}

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Parish Lenten Mission 2026', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Full announcement details...', maxLength: 65536 })
  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  body!: string;

  @ApiPropertyOptional({ example: 'Brief summary for notifications and feeds', maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @ApiPropertyOptional({ example: 'vi-VN', default: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ enum: AnnouncementPriority, default: AnnouncementPriority.Normal })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiProperty({ enum: AnnouncementScopeType, example: AnnouncementScopeType.Parish })
  @IsEnum(AnnouncementScopeType)
  scopeType!: AnnouncementScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  coverMediaAssetId?: string | null;

  @ApiProperty({ type: [AnnouncementTargetInputDto], description: 'Audience targets' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnnouncementTargetInputDto)
  targets!: AnnouncementTargetInputDto[];
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 65536 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  body?: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ enum: AnnouncementPriority })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ enum: AnnouncementScopeType, description: 'Only editable while DRAFT' })
  @IsOptional()
  @IsEnum(AnnouncementScopeType)
  scopeType?: AnnouncementScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Only editable while DRAFT' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  coverMediaAssetId?: string | null;

  @ApiPropertyOptional({ type: [AnnouncementTargetInputDto], description: 'Only editable while DRAFT' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnnouncementTargetInputDto)
  targets?: AnnouncementTargetInputDto[];
}

export class AnnouncementTargetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CommunicationTargetType })
  targetType!: CommunicationTargetType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parishId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  roleCode!: string | null;
}

export class AnnouncementAdminResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  locale!: string;

  @ApiProperty({ enum: AnnouncementPriority })
  priority!: AnnouncementPriority;

  @ApiProperty({ enum: AnnouncementStatus })
  status!: AnnouncementStatus;

  @ApiProperty({ enum: AnnouncementScopeType })
  scopeType!: AnnouncementScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parishId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  endsAt!: string | null;

  @ApiProperty()
  isPinned!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  coverMediaAssetId!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ format: 'uuid' })
  updatedByUserId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: [AnnouncementTargetDto] })
  targets!: AnnouncementTargetDto[];
}

export class AnnouncementAdminListQueryDto {
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

  @ApiPropertyOptional({ enum: AnnouncementStatus })
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;

  @ApiPropertyOptional({ enum: AnnouncementPriority })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ enum: AnnouncementScopeType })
  @IsOptional()
  @IsEnum(AnnouncementScopeType)
  scopeType?: AnnouncementScopeType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string;

  @ApiPropertyOptional({ enum: CommunicationTargetType })
  @IsOptional()
  @IsEnum(CommunicationTargetType)
  targetType?: CommunicationTargetType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ description: 'Search term for title or summary' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class AnnouncementAdminListResponseDto {
  @ApiProperty({ type: [AnnouncementAdminResponseDto] })
  items!: AnnouncementAdminResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class AnnouncementFeedQueryDto {
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

  @ApiPropertyOptional({ enum: AnnouncementPriority })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ description: 'Filter unread announcements only' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}

export class AnnouncementListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty({ enum: AnnouncementPriority })
  priority!: AnnouncementPriority;

  @ApiProperty()
  locale!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  endsAt!: string | null;

  @ApiProperty()
  isPinned!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  coverMediaAssetId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  publishedAt!: string;

  @ApiProperty()
  isRead!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  firstSeenAt!: string | null;
}

export class AnnouncementDetailDto extends AnnouncementListItemDto {
  @ApiProperty({ description: 'Full body content (markdown / rich text)' })
  body!: string;
}

export class AnnouncementFeedResponseDto {
  @ApiProperty({ type: [AnnouncementListItemDto] })
  items!: AnnouncementListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class DismissAnnouncementResponseDto {
  @ApiProperty({ format: 'uuid' })
  announcementId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  dismissedAt!: string;
}
