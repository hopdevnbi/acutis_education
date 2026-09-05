import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
  ValidateIf,
} from 'class-validator';
import {
  MISSION_LIST_DEFAULT_LIMIT,
  MISSION_LIST_DEFAULT_PAGE,
  MISSION_LIST_MAX_LIMIT,
} from '../constants/mission.constants';
import {
  MissionConditionType,
  MissionDefinitionStatus,
  MissionProgressStatus,
  MissionScopeType,
} from '../enums/gamification.enums';

export class CreateMissionDefinitionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({ enum: MissionScopeType })
  @IsEnum(MissionScopeType)
  scopeType!: MissionScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf(
    (o: CreateMissionDefinitionDto) =>
      o.scopeType === MissionScopeType.Parish || o.scopeType === MissionScopeType.Class,
  )
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((o: CreateMissionDefinitionDto) => o.scopeType === MissionScopeType.Class)
  @IsUUID('4')
  classId?: string | null;

  @ApiProperty({ enum: MissionConditionType })
  @IsEnum(MissionConditionType)
  conditionType!: MissionConditionType;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  targetCount!: number;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  pointsBonus?: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;
}

export class UpdateMissionDefinitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ enum: MissionScopeType })
  @IsOptional()
  @IsEnum(MissionScopeType)
  scopeType?: MissionScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  classId?: string | null;

  @ApiPropertyOptional({ enum: MissionConditionType })
  @IsOptional()
  @IsEnum(MissionConditionType)
  conditionType?: MissionConditionType;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  pointsBonus?: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;
}

export class MissionDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MissionDefinitionStatus })
  status!: MissionDefinitionStatus;

  @ApiProperty({ enum: MissionScopeType })
  scopeType!: MissionScopeType;

  @ApiPropertyOptional({ nullable: true })
  parishId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  classId!: string | null;

  @ApiProperty()
  scopeKey!: string;

  @ApiProperty({ enum: MissionConditionType })
  conditionType!: MissionConditionType;

  @ApiProperty()
  targetCount!: number;

  @ApiPropertyOptional({ nullable: true })
  pointsBonus!: number | null;

  @ApiPropertyOptional({ nullable: true })
  startsAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  endsAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class MissionDefinitionListResponseDto {
  @ApiProperty({ type: [MissionDefinitionResponseDto] })
  items!: MissionDefinitionResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class MissionAdminListQueryDto {
  @ApiPropertyOptional({ default: MISSION_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = MISSION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: MISSION_LIST_DEFAULT_LIMIT,
    maximum: MISSION_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MISSION_LIST_MAX_LIMIT)
  limit: number = MISSION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: MissionDefinitionStatus })
  @IsOptional()
  @IsEnum(MissionDefinitionStatus)
  status?: MissionDefinitionStatus;

  @ApiPropertyOptional({ enum: MissionScopeType })
  @IsOptional()
  @IsEnum(MissionScopeType)
  scopeType?: MissionScopeType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  parishId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @ApiPropertyOptional({ enum: MissionConditionType })
  @IsOptional()
  @IsEnum(MissionConditionType)
  conditionType?: MissionConditionType;
}

export class ClassMissionListQueryDto {
  @ApiPropertyOptional({
    enum: MissionDefinitionStatus,
    description: 'Defaults to ACTIVE in the controller when omitted.',
  })
  @IsOptional()
  @IsEnum(MissionDefinitionStatus)
  status?: MissionDefinitionStatus;
}

export class MissionProgressListQueryDto {
  @ApiPropertyOptional({ default: MISSION_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = MISSION_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: MISSION_LIST_DEFAULT_LIMIT,
    maximum: MISSION_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MISSION_LIST_MAX_LIMIT)
  limit: number = MISSION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: MissionProgressStatus })
  @IsOptional()
  @IsEnum(MissionProgressStatus)
  status?: MissionProgressStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required for Catechist when reading GLOBAL/PARISH mission progress.',
  })
  @IsOptional()
  @IsUUID('4')
  classId?: string;
}

export class MissionProgressItemDto {
  @ApiProperty()
  studentId!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiProperty()
  currentCount!: number;

  @ApiProperty()
  targetCount!: number;

  @ApiProperty({ enum: MissionProgressStatus })
  status!: MissionProgressStatus;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;
}

export class MissionProgressListResponseDto {
  @ApiProperty({ type: [MissionProgressItemDto] })
  items!: MissionProgressItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class LearnerMissionListQueryDto {
  @ApiPropertyOptional({
    enum: MissionProgressStatus,
    description: 'ACTIVE or COMPLETED learner progress view.',
  })
  @IsOptional()
  @IsEnum(MissionProgressStatus)
  status?: MissionProgressStatus;

  @ApiPropertyOptional({ default: MISSION_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    default: MISSION_LIST_DEFAULT_LIMIT,
    maximum: MISSION_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MISSION_LIST_MAX_LIMIT)
  limit?: number;
}

export class LearnerMissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MissionConditionType })
  conditionType!: MissionConditionType;

  @ApiProperty()
  currentCount!: number;

  @ApiProperty()
  targetCount!: number;

  @ApiProperty({
    enum: MissionProgressStatus,
    description: 'Progress status, or ACTIVE when no progress row exists yet (zero count).',
  })
  status!: MissionProgressStatus;

  @ApiPropertyOptional({ nullable: true })
  pointsBonus!: number | null;

  @ApiPropertyOptional({ nullable: true })
  startsAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  endsAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;
}

export class LearnerMissionListResponseDto {
  @ApiProperty({ type: [LearnerMissionResponseDto] })
  items!: LearnerMissionResponseDto[];

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  totalPages?: number;
}
