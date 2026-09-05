import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GamificationSummaryResponseDto {
  @ApiProperty()
  studentId!: string;

  @ApiPropertyOptional({ nullable: true })
  parishId!: string | null;

  @ApiProperty()
  pointsBalance!: number;

  @ApiProperty()
  lifetimePositivePoints!: number;

  @ApiProperty({ description: 'Future badges; zero until #004' })
  activeBadgeCount!: number;

  @ApiProperty({ description: 'Future missions; zero until #005' })
  completedMissionCount!: number;

  @ApiProperty({ description: 'Future milestones; zero until #004' })
  milestoneAchievementCount!: number;
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
