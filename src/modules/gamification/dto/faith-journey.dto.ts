import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearnerBadgeItemDto } from './badge.dto';
import { GamificationSummaryResponseDto, LatestAchievementDto } from './gamification-response.dto';
import { LearnerMilestoneItemDto } from './milestone.dto';
import { LearnerMissionResponseDto } from './mission.dto';

export class FaithJourneyTimelineItemDto {
  @ApiProperty({
    enum: ['POINTS', 'BADGE', 'MISSION', 'MILESTONE'],
    description: 'Composed timeline item kind.',
  })
  type!: 'POINTS' | 'BADGE' | 'MISSION' | 'MILESTONE';

  @ApiProperty({ description: 'Timestamp when the event/achievement occurred.' })
  occurredAt!: Date;

  @ApiProperty({ description: 'Item code (e.g. reason code, badge code, mission code, milestone code).' })
  code!: string;

  @ApiProperty({ description: 'Display title or key.' })
  title!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Optional description or localization key.' })
  descriptionKey?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Points delta if applicable.' })
  pointsDelta?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Public identifier of the underlying award/progress/entry.' })
  relatedId?: string | null;
}

export class FaithJourneyResponseDto {
  @ApiProperty({ type: GamificationSummaryResponseDto })
  summary!: GamificationSummaryResponseDto;

  @ApiProperty({
    type: [LearnerMissionResponseDto],
    description: 'Capped list of current eligible active missions (up to 10).',
  })
  activeMissions!: LearnerMissionResponseDto[];

  @ApiProperty({
    type: [LearnerBadgeItemDto],
    description: 'Capped list of recent active badges awarded (up to 10).',
  })
  recentBadges!: LearnerBadgeItemDto[];

  @ApiProperty({
    type: [LearnerMilestoneItemDto],
    description: 'Capped list of achieved milestones (up to 20).',
  })
  milestones!: LearnerMilestoneItemDto[];

  @ApiProperty({
    type: [FaithJourneyTimelineItemDto],
    description: 'Capped list of recent timeline entries ordered occurredAt DESC (up to 20).',
  })
  recentTimeline!: FaithJourneyTimelineItemDto[];
}
