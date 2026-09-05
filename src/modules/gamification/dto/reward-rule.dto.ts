import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RewardRuleStatus, RewardScopeType } from '../enums/gamification.enums';

export class CreateRewardRuleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  eventType!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sourceType!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  points!: number;

  @ApiPropertyOptional({ enum: RewardRuleStatus })
  @IsOptional()
  @IsEnum(RewardRuleStatus)
  status?: RewardRuleStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAwardsPerSource?: number;

  @ApiProperty({ enum: RewardScopeType })
  @IsEnum(RewardScopeType)
  scopeType!: RewardScopeType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((o: CreateRewardRuleDto) => o.scopeType === RewardScopeType.Parish)
  @IsUUID('4')
  parishId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date | null;

  @ApiPropertyOptional({
    description: 'Typed JSON for EXAM_SCORE_THRESHOLD only, e.g. {"minScorePercent":80}',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  conditionConfigJson?: string | null;
}

export class UpdateRewardRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ enum: RewardRuleStatus })
  @IsOptional()
  @IsEnum(RewardRuleStatus)
  status?: RewardRuleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAwardsPerSource?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  conditionConfigJson?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceType?: string;
}

export class RewardRuleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty()
  points!: number;

  @ApiProperty({ enum: RewardRuleStatus })
  status!: RewardRuleStatus;

  @ApiProperty()
  maxAwardsPerSource!: number;

  @ApiProperty({ enum: RewardScopeType })
  scopeType!: RewardScopeType;

  @ApiPropertyOptional({ nullable: true })
  parishId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  effectiveFrom!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  effectiveTo!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  conditionConfigJson!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class RewardRuleListResponseDto {
  @ApiProperty({ type: [RewardRuleResponseDto] })
  items!: RewardRuleResponseDto[];
}
