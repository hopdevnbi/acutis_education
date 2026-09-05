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
  CommunicationTargetType,
  EventRegistrationStatus,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';

export class EventTargetInputDto {
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

export class CreateEventDto {
  @ApiProperty({ example: 'PARISH-RETREAT-2026', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Annual Parish Youth Retreat', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Full event details and itinerary...', maxLength: 65536 })
  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  description!: string;

  @ApiPropertyOptional({ example: 'Short overview of the retreat', maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @ApiPropertyOptional({ example: 'vi-VN', default: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiProperty({ enum: EventScopeType, example: EventScopeType.Parish })
  @IsEnum(EventScopeType)
  scopeType!: EventScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  classId?: string | null;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh', default: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @ApiPropertyOptional({ example: 'Parish Hall', maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueName?: string | null;

  @ApiPropertyOptional({ example: '123 Holy Way', maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  coverMediaAssetId?: string | null;

  @ApiPropertyOptional({ example: 100, minimum: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRegistrationRequired?: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationDeadline?: Date | null;

  @ApiPropertyOptional({ type: [EventTargetInputDto], description: 'Audience targets (defaults to ownership scope if omitted)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTargetInputDto)
  targets?: EventTargetInputDto[];
}

export class UpdateEventDto {
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
  description?: string;

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

  @ApiPropertyOptional({ enum: EventScopeType, description: 'Only editable while DRAFT' })
  @IsOptional()
  @IsEnum(EventScopeType)
  scopeType?: EventScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Only editable while DRAFT' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Only editable while DRAFT' })
  @IsOptional()
  @IsUUID('4')
  classId?: string | null;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueName?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  coverMediaAssetId?: string | null;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRegistrationRequired?: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationDeadline?: Date | null;

  @ApiPropertyOptional({ type: [EventTargetInputDto], description: 'Only editable while DRAFT' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTargetInputDto)
  targets?: EventTargetInputDto[];
}

export class CancelEventDto {
  @ApiProperty({ example: 'Event cancelled due to severe weather conditions.', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  cancellationReason!: string;
}

export class CheckInEventDto {
  @ApiProperty({ format: 'uuid', description: 'Registration UUID to check in' })
  @IsUUID('4')
  registrationId!: string;
}

export class EventTargetDto {
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

export class EventAdminResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  locale!: string;

  @ApiProperty({ enum: EventScopeType })
  scopeType!: EventScopeType;

  @ApiProperty()
  scopeKey!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parishId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classId!: string | null;

  @ApiProperty({ enum: EventStatus })
  status!: EventStatus;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  endsAt!: string;

  @ApiPropertyOptional({ nullable: true })
  venueName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  coverMediaAssetId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  capacity!: number | null;

  @ApiProperty()
  isRegistrationRequired!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  registrationDeadline!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  cancelledAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancellationReason!: string | null;

  @ApiProperty()
  version!: number;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ format: 'uuid' })
  updatedByUserId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: [EventTargetDto] })
  targets!: EventTargetDto[];

  @ApiPropertyOptional({ description: 'Active registration count (REGISTERED + ATTENDED)' })
  activeRegistrationCount?: number;
}

export class EventAdminListQueryDto {
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

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ enum: EventScopeType })
  @IsOptional()
  @IsEnum(EventScopeType)
  scopeType?: EventScopeType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;

  @ApiPropertyOptional({ description: 'Search term for code, title, or summary' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class EventAdminListResponseDto {
  @ApiProperty({ type: [EventAdminResponseDto] })
  items!: EventAdminResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class EventListQueryDto {
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

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

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

export class EventListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  locale!: string;

  @ApiProperty({ enum: EventScopeType })
  scopeType!: EventScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parishId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classId!: string | null;

  @ApiProperty({ enum: EventStatus })
  status!: EventStatus;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  endsAt!: string;

  @ApiPropertyOptional({ nullable: true })
  venueName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  coverMediaAssetId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  capacity!: number | null;

  @ApiProperty()
  isRegistrationRequired!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  registrationDeadline!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ description: 'Indicates if current user or their child is actively registered' })
  isRegistered?: boolean;
}

export class EventRegistrationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  eventId!: string;

  @ApiProperty()
  registrantKey!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  studentId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  enrollmentId!: string | null;

  @ApiProperty({ enum: EventRegistrationStatus })
  status!: EventRegistrationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  registeredAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  cancelledAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  checkedInAt!: string | null;
}

export class EventDetailDto extends EventListItemDto {
  @ApiProperty({ description: 'Full event description' })
  description!: string;

  @ApiPropertyOptional({ type: EventRegistrationDto, nullable: true })
  currentUserRegistration?: EventRegistrationDto | null;
}

export class EventListResponseDto {
  @ApiProperty({ type: [EventListItemDto] })
  items!: EventListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class RegisterEventDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Student UUID if parent is registering their child' })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;
}

export class CancelRegistrationDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Student UUID if parent is cancelling child registration' })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;
}

export class MyEventRegistrationItemDto {
  @ApiProperty({ type: EventRegistrationDto })
  registration!: EventRegistrationDto;

  @ApiProperty({ type: EventListItemDto })
  event!: EventListItemDto;
}

export class MyEventRegistrationsQueryDto {
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

  @ApiPropertyOptional({ enum: EventRegistrationStatus })
  @IsOptional()
  @IsEnum(EventRegistrationStatus)
  status?: EventRegistrationStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class MyEventRegistrationsResponseDto {
  @ApiProperty({ type: [MyEventRegistrationItemDto] })
  items!: MyEventRegistrationItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class EventAttendeeListQueryDto {
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

  @ApiPropertyOptional({ enum: EventRegistrationStatus })
  @IsOptional()
  @IsEnum(EventRegistrationStatus)
  status?: EventRegistrationStatus;

  @ApiPropertyOptional({ description: 'Search term for registrant name or key' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class EventAttendeeListItemDto {
  @ApiProperty({ format: 'uuid', description: 'Registration UUID' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  eventId!: string;

  @ApiProperty()
  registrantKey!: string;

  @ApiProperty({ enum: ['USER', 'STUDENT'] })
  registrantType!: 'USER' | 'STUDENT';

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  studentId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: EventRegistrationStatus })
  status!: EventRegistrationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  registeredAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  checkedInAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  cancelledAt!: string | null;
}

export class EventAttendeeListResponseDto {
  @ApiProperty({ type: [EventAttendeeListItemDto] })
  items!: EventAttendeeListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
