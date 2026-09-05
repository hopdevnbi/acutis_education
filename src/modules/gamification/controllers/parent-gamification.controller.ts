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
import { GamificationSummaryResponseDto } from '../dto/gamification-response.dto';
import { FaithJourneyResponseDto } from '../dto/faith-journey.dto';
import { LearnerBadgeListResponseDto } from '../dto/badge.dto';
import { LearnerMilestoneListResponseDto } from '../dto/milestone.dto';
import {
  LearnerMissionListQueryDto,
  LearnerMissionListResponseDto,
} from '../dto/mission.dto';
import { GamificationService } from '../gamification.service';
import {
  toFaithJourneyResponseDto,
  toGamificationSummaryResponseDto,
  toLearnerBadgeListResponseDto,
  toLearnerMilestoneListResponseDto,
  toLearnerMissionListResponseDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller('me/parent/enrollments/:enrollmentId')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ParentGamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
  ) {}

  @Get('gamification/summary')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Parent linked-child gamification summary',
    description:
      'Requires genuine PARENT role and an ACTIVE guardian relationship to the enrolled student. Cross-parish linked child allowed. Omit staff-only fields. No full points ledger route.',
  })
  @ApiParam({ name: 'enrollmentId', format: 'uuid' })
  @ApiOkResponse({ type: GamificationSummaryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getChildSummary(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ): Promise<GamificationSummaryResponseDto> {
    try {
      const { studentId, enrollment } =
        await this.gamificationAccessService.assertParentCanReadStudentGamificationByEnrollment(
          authenticatedUser.userId,
          enrollmentId,
        );
      const summary = await this.gamificationService.getGamificationSummary({
        studentId,
        parishId: enrollment.parishId,
      });
      return toGamificationSummaryResponseDto(summary);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('faith-journey')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Parent linked-child faith journey',
    description:
      'Composed read model for a linked child: points summary, active missions (capped 10), recent badges (capped 10), milestones (capped 20), timeline (capped 20). No staff notes, actor IDs, or raw manual adjustment reasons.',
  })
  @ApiParam({ name: 'enrollmentId', format: 'uuid' })
  @ApiOkResponse({ type: FaithJourneyResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getChildFaithJourney(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ): Promise<FaithJourneyResponseDto> {
    try {
      const { studentId, enrollment } =
        await this.gamificationAccessService.assertParentCanReadStudentGamificationByEnrollment(
          authenticatedUser.userId,
          enrollmentId,
        );
      const faithJourney = await this.gamificationService.getFaithJourney({
        studentId,
        enrollmentId,
        parishId: enrollment.parishId,
      });
      return toFaithJourneyResponseDto(faithJourney);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('badges')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Parent linked-child active badge awards',
    description:
      'Requires genuine PARENT role and ACTIVE guardian relationship. Learner-safe shape: omits awardedByUserId and ruleConfig.',
  })
  @ApiParam({ name: 'enrollmentId', format: 'uuid' })
  @ApiOkResponse({ type: LearnerBadgeListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async listChildBadges(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ): Promise<LearnerBadgeListResponseDto> {
    try {
      const { studentId } =
        await this.gamificationAccessService.assertParentCanReadStudentGamificationByEnrollment(
          authenticatedUser.userId,
          enrollmentId,
        );
      const items = await this.gamificationService.listLearnerBadges(studentId);
      return toLearnerBadgeListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('missions')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Parent linked-child missions and progress',
    description:
      'ACTIVE or COMPLETED missions for linked child. Learner-safe shape: omits internal event IDs and raw configs.',
  })
  @ApiParam({ name: 'enrollmentId', format: 'uuid' })
  @ApiOkResponse({ type: LearnerMissionListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async listChildMissions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
    @Query() query: LearnerMissionListQueryDto,
  ): Promise<LearnerMissionListResponseDto> {
    try {
      const { studentId } =
        await this.gamificationAccessService.assertParentCanReadStudentGamificationByEnrollment(
          authenticatedUser.userId,
          enrollmentId,
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

  @Get('milestones')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Parent linked-child milestone achievements',
    description:
      'Requires genuine PARENT role and ACTIVE guardian relationship. Learner-safe shape: omits triggerConfigJson and internal source IDs.',
  })
  @ApiParam({ name: 'enrollmentId', format: 'uuid' })
  @ApiOkResponse({ type: LearnerMilestoneListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async listChildMilestones(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ): Promise<LearnerMilestoneListResponseDto> {
    try {
      const { studentId } =
        await this.gamificationAccessService.assertParentCanReadStudentGamificationByEnrollment(
          authenticatedUser.userId,
          enrollmentId,
        );
      const items = await this.gamificationService.listLearnerMilestones(studentId);
      return toLearnerMilestoneListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
