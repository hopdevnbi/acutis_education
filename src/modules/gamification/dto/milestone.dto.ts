import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  MilestoneDefinitionStatus,
  MilestoneTriggerType,
} from '../enums/gamification.enums';

export class CreateMilestoneDefinitionDto {
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

  @ApiProperty({ enum: MilestoneTriggerType })
  @IsEnum(MilestoneTriggerType)
  triggerType!: MilestoneTriggerType;

  @ApiPropertyOptional({
    description:
      'Typed JSON config, e.g. {"minCount":5}. Null/{} for FIRST_* triggers.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  triggerConfigJson?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;
}

export class UpdateMilestoneDefinitionDto {
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

  @ApiPropertyOptional({
    enum: MilestoneDefinitionStatus,
    description: 'Lifecycle: ACTIVE -> ARCHIVED only (no hard delete; no ARCHIVED -> ACTIVE in MVP).',
  })
  @IsOptional()
  @IsEnum(MilestoneDefinitionStatus)
  status?: MilestoneDefinitionStatus;

  @ApiPropertyOptional({ enum: MilestoneTriggerType })
  @IsOptional()
  @IsEnum(MilestoneTriggerType)
  triggerType?: MilestoneTriggerType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  triggerConfigJson?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;
}

export class MilestoneDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MilestoneDefinitionStatus })
  status!: MilestoneDefinitionStatus;

  @ApiProperty({ enum: MilestoneTriggerType })
  triggerType!: MilestoneTriggerType;

  @ApiPropertyOptional({ nullable: true })
  triggerConfigJson!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class MilestoneDefinitionListResponseDto {
  @ApiProperty({ type: [MilestoneDefinitionResponseDto] })
  items!: MilestoneDefinitionResponseDto[];
}

/** Learner-facing milestone achievement + definition fields (privacy-minimized). */
export class LearnerMilestoneItemDto {
  @ApiProperty({ description: 'Milestone definition id' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  achievedAt!: Date;
}

export class LearnerMilestoneListResponseDto {
  @ApiProperty({ type: [LearnerMilestoneItemDto] })
  items!: LearnerMilestoneItemDto[];
}

/**
 * Staff student-milestone achievement read.
 * Omits sourceId / internal audit fields and triggerConfigJson.
 */
export class StaffStudentMilestoneItemDto {
  @ApiProperty({ description: 'Milestone achievement id' })
  achievementId!: string;

  @ApiProperty({ description: 'Milestone definition id' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  achievedAt!: Date;
}

export class StaffStudentMilestoneListResponseDto {
  @ApiProperty({ type: [StaffStudentMilestoneItemDto] })
  items!: StaffStudentMilestoneItemDto[];
}
