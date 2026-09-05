import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NOTIFICATION_ACTION_URL_MAX_LENGTH,
  NOTIFICATION_DEVICE_TOKEN_MAX_LENGTH,
  NOTIFICATION_SNIPPET_MAX_LENGTH,
  NOTIFICATION_TITLE_MAX_LENGTH,
} from '../constants/notifications-permissions.constants';
import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';

export class NotificationInboxQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter unread notifications only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationSourceType })
  @IsOptional()
  @IsEnum(NotificationSourceType)
  sourceType?: NotificationSourceType;
}

export class NotificationListItemDto {
  @ApiProperty({ format: 'uuid', description: 'Primary item ID (notificationId)' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'Notification header ID' })
  notificationId!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationSourceType })
  sourceType!: NotificationSourceType;

  @ApiProperty({ format: 'uuid' })
  sourceId!: string;

  @ApiProperty({ maxLength: NOTIFICATION_TITLE_MAX_LENGTH })
  title!: string;

  @ApiProperty({ maxLength: NOTIFICATION_SNIPPET_MAX_LENGTH })
  snippet!: string;

  @ApiProperty({ maxLength: NOTIFICATION_ACTION_URL_MAX_LENGTH })
  actionUrl!: string;

  @ApiProperty({ description: 'Read status for the authenticated user' })
  isRead!: boolean;

  @ApiProperty({ type: Date, nullable: true })
  readAt!: Date | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}

export class NotificationInboxResponseDto {
  @ApiProperty({ type: [NotificationListItemDto] })
  items!: NotificationListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class NotificationUnreadCountResponseDto {
  @ApiProperty({ example: 5, description: 'Count of unread notifications for current user' })
  unreadCount!: number;
}

export class NotificationReadAllResponseDto {
  @ApiProperty({ example: 5, description: 'Number of notifications marked as read' })
  updatedCount!: number;
}

export class RegisterNotificationDeviceDto {
  @ApiProperty({ enum: NotificationDevicePlatform, example: NotificationDevicePlatform.Ios })
  @IsEnum(NotificationDevicePlatform)
  platform!: NotificationDevicePlatform;

  @ApiProperty({ enum: NotificationDeviceProvider, example: NotificationDeviceProvider.Expo })
  @IsEnum(NotificationDeviceProvider)
  provider!: NotificationDeviceProvider;

  @ApiProperty({ maxLength: NOTIFICATION_DEVICE_TOKEN_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NOTIFICATION_DEVICE_TOKEN_MAX_LENGTH)
  token!: string;

  @ApiPropertyOptional({ maxLength: 32, example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @ApiPropertyOptional({ maxLength: 32, example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;
}

export class NotificationDeviceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: NotificationDevicePlatform })
  platform!: NotificationDevicePlatform;

  @ApiProperty({ enum: NotificationDeviceProvider })
  provider!: NotificationDeviceProvider;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true })
  appVersion!: string | null;

  @ApiProperty({ nullable: true })
  locale!: string | null;

  @ApiProperty({ type: Date })
  lastSeenAt!: Date;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}

export class NotificationMarkReadParamDto {
  @ApiProperty({ format: 'uuid', description: 'Notification ID' })
  @IsUUID('4')
  id!: string;
}

export class NotificationDeviceParamDto {
  @ApiProperty({ format: 'uuid', description: 'Device ID' })
  @IsUUID('4')
  id!: string;
}
