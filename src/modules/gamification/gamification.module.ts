import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { GamificationAccessService } from './access/gamification-access.service';
import { BadgeAwardEntity } from './badges/entities/badge-award.entity';
import { BadgeDefinitionEntity } from './badges/entities/badge-definition.entity';
import { BadgeAwardProcessor } from './badges/services/badge-award.processor';
import { BadgeManualAwardService } from './badges/services/badge-manual-award.service';
import { BadgeService } from './badges/services/badge.service';
import { BadgeDefinitionsController } from './controllers/badge-definitions.controller';
import { LearnerGamificationController } from './controllers/learner-gamification.controller';
import { MilestoneDefinitionsController } from './controllers/milestone-definitions.controller';
import { RewardRulesController } from './controllers/reward-rules.controller';
import { StaffBadgeAwardController } from './controllers/staff-badge-award.controller';
import { StaffGamificationController } from './controllers/staff-gamification.controller';
import { StaffPointsController } from './controllers/staff-points.controller';
import { GamificationService } from './gamification.service';
import { RewardEligibleEventListener } from './listeners/reward-eligible-event.listener';
import { MilestoneAchievementEntity } from './milestones/entities/milestone-achievement.entity';
import { MilestoneDefinitionEntity } from './milestones/entities/milestone-definition.entity';
import { MilestoneAchievementProcessor } from './milestones/services/milestone-achievement.processor';
import { MilestoneService } from './milestones/services/milestone.service';
import { MissionDefinitionEntity } from './missions/entities/mission-definition.entity';
import { MissionProgressEntity } from './missions/entities/mission-progress.entity';
import { MissionService } from './missions/services/mission.service';
import { PointLedgerEntryEntity } from './points/entities/point-ledger-entry.entity';
import { PointAdjustmentService } from './points/services/point-adjustment.service';
import { PointLedgerService } from './points/services/point-ledger.service';
import { ProcessedRewardEventEntity } from './rewards/entities/processed-reward-event.entity';
import { RewardRuleEntity } from './rewards/entities/reward-rule.entity';
import { RewardEventHistoryService } from './rewards/services/reward-event-history.service';
import { RewardEventReceiptService } from './rewards/services/reward-event-receipt.service';
import { RewardIngestService } from './rewards/services/reward-ingest.service';
import { RewardRuleService } from './rewards/services/reward-rule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardRuleEntity,
      ProcessedRewardEventEntity,
      PointLedgerEntryEntity,
      BadgeDefinitionEntity,
      BadgeAwardEntity,
      MissionDefinitionEntity,
      MissionProgressEntity,
      MilestoneDefinitionEntity,
      MilestoneAchievementEntity,
    ]),
    ApplicationEventsModule,
    StudentModule,
    EnrollmentModule,
    ClassModule,
    ParishModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [
    StaffGamificationController,
    StaffPointsController,
    StaffBadgeAwardController,
    LearnerGamificationController,
    RewardRulesController,
    BadgeDefinitionsController,
    MilestoneDefinitionsController,
  ],
  providers: [
    GamificationService,
    GamificationAccessService,
    RewardRuleService,
    RewardEventReceiptService,
    RewardEventHistoryService,
    RewardIngestService,
    RewardEligibleEventListener,
    PointLedgerService,
    PointAdjustmentService,
    BadgeService,
    BadgeAwardProcessor,
    BadgeManualAwardService,
    MissionService,
    MilestoneService,
    MilestoneAchievementProcessor,
  ],
  exports: [GamificationService],
})
export class GamificationModule {}
