import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
  BadgeAwardMode,
  BadgeDefinitionStatus,
  BadgeRuleType,
  BadgeScopeType,
} from '../enums/gamification.enums';

export class CreateBadgeDefinitionDto {
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

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  category!: string;

  @ApiProperty({ enum: BadgeScopeType })
  @IsEnum(BadgeScopeType)
  scopeType!: BadgeScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((o: CreateBadgeDefinitionDto) => o.scopeType === BadgeScopeType.Parish)
  @IsUUID('4')
  parishId?: string | null;

  @ApiProperty({ enum: BadgeAwardMode })
  @IsEnum(BadgeAwardMode)
  awardMode!: BadgeAwardMode;

  @ApiPropertyOptional({
    enum: BadgeRuleType,
    nullable: true,
    description: 'Required for AUTOMATIC/BOTH; typically null for MANUAL-only badges.',
  })
  @IsOptional()
  @IsEnum(BadgeRuleType)
  ruleEventType?: BadgeRuleType | null;

  @ApiPropertyOptional({
    description:
      'Typed JSON config, e.g. {"minCount":5} or {"minScorePercent":80}. Null/{} for FIRST_* rules.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  ruleConfigJson?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  pointsBonus?: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  iconMediaAssetId?: string | null;
}

export class UpdateBadgeDefinitionDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ enum: BadgeScopeType })
  @IsOptional()
  @IsEnum(BadgeScopeType)
  scopeType?: BadgeScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({
    enum: BadgeDefinitionStatus,
    description: 'Lifecycle: DRAFT -> ACTIVE -> ARCHIVED, or DRAFT -> ARCHIVED.',
  })
  @IsOptional()
  @IsEnum(BadgeDefinitionStatus)
  status?: BadgeDefinitionStatus;

  @ApiPropertyOptional({ enum: BadgeAwardMode })
  @IsOptional()
  @IsEnum(BadgeAwardMode)
  awardMode?: BadgeAwardMode;

  @ApiPropertyOptional({ enum: BadgeRuleType, nullable: true })
  @IsOptional()
  @IsEnum(BadgeRuleType)
  ruleEventType?: BadgeRuleType | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  ruleConfigJson?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  pointsBonus?: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  iconMediaAssetId?: string | null;
}

export class BadgeDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  category!: string;

  @ApiProperty({ enum: BadgeScopeType })
  scopeType!: BadgeScopeType;

  @ApiPropertyOptional({ nullable: true })
  parishId!: string | null;

  @ApiProperty({ enum: BadgeDefinitionStatus })
  status!: BadgeDefinitionStatus;

  @ApiProperty({ enum: BadgeAwardMode })
  awardMode!: BadgeAwardMode;

  @ApiPropertyOptional({ nullable: true })
  ruleEventType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ruleConfigJson!: string | null;

  @ApiPropertyOptional({ nullable: true })
  pointsBonus!: number | null;

  @ApiPropertyOptional({ nullable: true })
  iconMediaAssetId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class BadgeDefinitionListResponseDto {
  @ApiProperty({ type: [BadgeDefinitionResponseDto] })
  items!: BadgeDefinitionResponseDto[];
}

/** Learner-facing active badge award + definition fields (privacy-minimized). */
export class LearnerBadgeItemDto {
  @ApiProperty({ description: 'Badge definition id' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional({ nullable: true })
  iconMediaAssetId!: string | null;

  @ApiProperty()
  awardedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  pointsBonus!: number | null;
}

export class LearnerBadgeListResponseDto {
  @ApiProperty({ type: [LearnerBadgeItemDto] })
  items!: LearnerBadgeItemDto[];
}

/**
 * Staff student-badge award read.
 * Omits awardedByUserId and ruleConfig; revokedAt is null while active.
 */
export class StaffStudentBadgeItemDto {
  @ApiProperty({ description: 'Badge award id' })
  awardId!: string;

  @ApiProperty({ description: 'Badge definition id' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional({ nullable: true })
  iconMediaAssetId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  pointsBonus!: number | null;

  @ApiProperty()
  awardedAt!: Date;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null while the award is active; set when soft-revoked.',
  })
  revokedAt!: Date | null;
}

export class StaffStudentBadgeListResponseDto {
  @ApiProperty({ type: [StaffStudentBadgeItemDto] })
  items!: StaffStudentBadgeItemDto[];
}

export class BadgeAwardActionResponseDto {
  @ApiProperty()
  awardId!: string;

  @ApiProperty()
  badgeDefinitionId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  awardedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  revokedAt!: Date | null;

  @ApiProperty()
  sourceType!: string;
}
