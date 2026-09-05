import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { GamificationAccessService } from './access/gamification-access.service';
import { BadgeAwardEntity } from './badges/entities/badge-award.entity';
import { BadgeDefinitionEntity } from './badges/entities/badge-definition.entity';
import { BadgeService } from './badges/services/badge.service';
import { GamificationService } from './gamification.service';
import { MilestoneAchievementEntity } from './milestones/entities/milestone-achievement.entity';
import { MilestoneDefinitionEntity } from './milestones/entities/milestone-definition.entity';
import { MilestoneService } from './milestones/services/milestone.service';
import { MissionDefinitionEntity } from './missions/entities/mission-definition.entity';
import { MissionProgressEntity } from './missions/entities/mission-progress.entity';
import { MissionService } from './missions/services/mission.service';
import { PointLedgerEntryEntity } from './points/entities/point-ledger-entry.entity';
import { PointLedgerService } from './points/services/point-ledger.service';
import { ProcessedRewardEventEntity } from './rewards/entities/processed-reward-event.entity';
import { RewardRuleEntity } from './rewards/entities/reward-rule.entity';
import { RewardEventReceiptService } from './rewards/services/reward-event-receipt.service';
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
    StudentModule,
    EnrollmentModule,
    ClassModule,
    ParishModule,
    AuthModule,
    AccessControlModule,
  ],
  providers: [
    GamificationService,
    GamificationAccessService,
    RewardRuleService,
    RewardEventReceiptService,
    PointLedgerService,
    BadgeService,
    MissionService,
    MilestoneService,
  ],
  exports: [GamificationService],
})
export class GamificationModule {}
