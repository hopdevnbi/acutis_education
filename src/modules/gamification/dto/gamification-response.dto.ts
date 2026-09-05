import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LatestAchievementDto {
  @ApiProperty({
    enum: ['BADGE', 'MISSION', 'MILESTONE'],
    description: 'Achievement kind',
  })
  kind!: 'BADGE' | 'MISSION' | 'MILESTONE';

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  achievedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  pointsBonus?: number | null;
}

export class GamificationSummaryResponseDto {
  @ApiProperty()
  studentId!: string;

  @ApiPropertyOptional({ nullable: true })
  parishId!: string | null;

  @ApiProperty()
  pointsBalance!: number;

  @ApiProperty()
  lifetimePositivePoints!: number;

  @ApiProperty()
  activeBadgeCount!: number;

  @ApiProperty({
    description: 'Eligible ACTIVE missions for the learner (includes zero-progress missions).',
  })
  activeMissionCount!: number;

  @ApiProperty({ description: 'Persisted COMPLETED mission_progress rows.' })
  completedMissionCount!: number;

  @ApiProperty()
  milestoneAchievementCount!: number;

  @ApiPropertyOptional({ type: LatestAchievementDto, nullable: true })
  latestAchievement!: LatestAchievementDto | null;
}

export class PointLedgerItemStaffResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pointsDelta!: number;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty()
  reasonCode!: string;

  @ApiPropertyOptional({ nullable: true })
  descriptionKey!: string | null;

  @ApiPropertyOptional({ nullable: true })
  staffNote!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PointLedgerItemLearnerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pointsDelta!: number;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty({ description: 'Stable public reason key for UI' })
  reasonKey!: string;

  @ApiPropertyOptional({ nullable: true })
  descriptionKey!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PointLedgerListStaffResponseDto {
  @ApiProperty({ type: [PointLedgerItemStaffResponseDto] })
  items!: PointLedgerItemStaffResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PointLedgerListLearnerResponseDto {
  @ApiProperty({ type: [PointLedgerItemLearnerResponseDto] })
  items!: PointLedgerItemLearnerResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ManualPointAdjustmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  pointsDelta!: number;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty()
  reasonCode!: string;

  @ApiPropertyOptional({ nullable: true })
  staffNote!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
