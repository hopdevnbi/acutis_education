import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GamificationAccessService } from '../access/gamification-access.service';
import { GAMIFICATION_READ_PERMISSION } from '../constants/gamification-permissions.constants';
import {
  GamificationSummaryResponseDto,
  PointLedgerListLearnerResponseDto,
} from '../dto/gamification-response.dto';
import { FaithJourneyResponseDto } from '../dto/faith-journey.dto';
import { LearnerBadgeListResponseDto } from '../dto/badge.dto';
import { LearnerMilestoneListResponseDto } from '../dto/milestone.dto';
import {
  LearnerMissionListQueryDto,
  LearnerMissionListResponseDto,
  LearnerMissionResponseDto,
} from '../dto/mission.dto';
import { ListPointsQueryDto } from '../dto/list-points-query.dto';
import { GamificationService } from '../gamification.service';
import {
  toFaithJourneyResponseDto,
  toGamificationSummaryResponseDto,
  toLearnerBadgeListResponseDto,
  toLearnerMilestoneListResponseDto,
  toLearnerMissionListResponseDto,
  toLearnerMissionResponseDto,
  toLearnerPointLedgerListDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller('me/learner')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class LearnerGamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
  ) {}

  @Get('gamification/summary')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Learner self gamification summary',
    description: 'Student self only. No client studentId. Omits staff-only fields.',
  })
  @ApiOkResponse({ type: GamificationSummaryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async getSummary(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<GamificationSummaryResponseDto> {
    try {
      const studentId = await this.gamificationAccessService.assertLearnerCanReadOwnGamification(
        authenticatedUser.userId,
      );
      const summary = await this.gamificationService.getGamificationSummary({ studentId });
      return toGamificationSummaryResponseDto(summary);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('faith-journey')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Learner self faith journey',
    description:
      'Student self only. Composed read model: points summary, active missions (capped 10), recent badges (capped 10), milestones (capped 20), timeline (capped 20). No staff notes, actor IDs, or PII.',
  })
  @ApiOkResponse({ type: FaithJourneyResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async getFaithJourney(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<FaithJourneyResponseDto> {
    try {
      const studentId = await this.gamificationAccessService.assertLearnerCanReadOwnGamification(
        authenticatedUser.userId,
      );
      const faithJourney = await this.gamificationService.getFaithJourney({ studentId });
      return toFaithJourneyResponseDto(faithJourney);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('points')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Learner self point ledger',
    description: 'Omits staffNote and awardedByUserId. Max 50 per page.',
  })
  @ApiOkResponse({ type: PointLedgerListLearnerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listPoints(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: ListPointsQueryDto,
  ): Promise<PointLedgerListLearnerResponseDto> {
    try {
      const studentId = await this.gamificationAccessService.assertLearnerCanReadOwnGamification(
        authenticatedUser.userId,
      );
      const result = await this.gamificationService.listPointLedgerPaginated({
        studentId,
        page: query.page,
        limit: query.limit,
        includeStaffNote: false,
      });
      return toLearnerPointLedgerListDto(result);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('badges')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Learner self active badges',
    description:
      'Self only. Omits awardedByUserId, ruleConfig, staff internals. Parent deferred to #006.',
  })
  @ApiOkResponse({ type: LearnerBadgeListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listBadges(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<LearnerBadgeListResponseDto> {
    try {
      const studentId = await this.gamificationAccessService.assertLearnerCanReadOwnGamification(
        authenticatedUser.userId,
      );
      const items = await this.gamificationService.listLearnerBadges(studentId);
      return toLearnerBadgeListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('milestones')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Learner self milestone achievements',
    description: 'Self only. Omits internal source IDs and staff fields. Parent deferred to #006.',
  })
  @ApiOkResponse({ type: LearnerMilestoneListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listMilestones(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<LearnerMilestoneListResponseDto> {
    try {
      const studentId = await this.gamificationAccessService.assertLearnerCanReadOwnGamification(
        authenticatedUser.userId,
      );
      const items = await this.gamificationService.listLearnerMilestones(studentId);
      return toLearnerMilestoneListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('missions')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Learner self missions',
    description:
      'Self only. Eligible ACTIVE missions show with currentCount=0 when no progress row yet. Parent deferred to #006.',
  })
  @ApiOkResponse({ type: LearnerMissionListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listMissions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: LearnerMissionListQueryDto,
  ): Promise<LearnerMissionListResponseDto> {
    try {
      const studentId = await this.gamificationAccessService.assertLearnerCanReadOwnGamification(
        authenticatedUser.userId,
      );
      const items = await this.gamificationService.listLearnerMissions({
        studentId,
        status: query.status,
      });
      return toLearnerMissionListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('missions/:missionId')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Learner self mission detail',
    description:
      'Applicable ACTIVE mission or historical progress/completion after transfer.',
  })
  @ApiParam({ name: 'missionId', format: 'uuid' })
  @ApiOkResponse({ type: LearnerMissionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getMission(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('missionId') missionId: string,
  ): Promise<LearnerMissionResponseDto> {
    try {
      const studentId = await this.gamificationAccessService.assertLearnerCanReadOwnGamification(
        authenticatedUser.userId,
      );
      const item = await this.gamificationService.getLearnerMission({ studentId, missionId });
      return toLearnerMissionResponseDto(item);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
