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
  PointLedgerListStaffResponseDto,
} from '../dto/gamification-response.dto';
import { FaithJourneyResponseDto } from '../dto/faith-journey.dto';
import { StaffStudentBadgeListResponseDto } from '../dto/badge.dto';
import { StaffStudentMilestoneListResponseDto } from '../dto/milestone.dto';
import { ListPointsQueryDto } from '../dto/list-points-query.dto';
import { GamificationService } from '../gamification.service';
import {
  toFaithJourneyResponseDto,
  toGamificationSummaryResponseDto,
  toStaffPointLedgerListDto,
  toStaffStudentBadgeListResponseDto,
  toStaffStudentMilestoneListResponseDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class StaffGamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
  ) {}

  @Get('students/:studentId/gamification/summary')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff gamification summary for a student',
    description:
      'Requires gamification.read. SuperAdmin, ParishAdmin (own parish ACTIVE enrollment), or Catechist (ACTIVE assigned class). Parent/Student generic routes denied by scope.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiOkResponse({ type: GamificationSummaryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getStudentSummary(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<GamificationSummaryResponseDto> {
    try {
      await this.gamificationAccessService.assertStaffCanReadStudentGamification(
        authenticatedUser.userId,
        studentId,
      );
      const summary = await this.gamificationService.getGamificationSummary({ studentId });
      return toGamificationSummaryResponseDto(summary);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('students/:studentId/faith-journey')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff faith journey for a student',
    description:
      'Requires gamification.read. Scoped to SuperAdmin, ParishAdmin (own parish active enrollment), or Catechist (current ACTIVE assignment to active class). Omits attendance notes, exam answers, pastoral fields, raw manual adjustment reasons, and PII.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiOkResponse({ type: FaithJourneyResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getStudentFaithJourney(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<FaithJourneyResponseDto> {
    try {
      await this.gamificationAccessService.assertStaffCanReadStudentGamification(
        authenticatedUser.userId,
        studentId,
      );
      const faithJourney = await this.gamificationService.getFaithJourney({ studentId });
      return toFaithJourneyResponseDto(faithJourney);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('students/:studentId/points')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff paginated point ledger for a student',
    description: 'createdAt DESC, id DESC. Max 50. Includes staffNote.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiOkResponse({ type: PointLedgerListStaffResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listStudentPoints(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: ListPointsQueryDto,
  ): Promise<PointLedgerListStaffResponseDto> {
    try {
      await this.gamificationAccessService.assertStaffCanReadStudentGamification(
        authenticatedUser.userId,
        studentId,
      );
      const result = await this.gamificationService.listPointLedgerPaginated({
        studentId,
        page: query.page,
        limit: query.limit,
        includeStaffNote: true,
      });
      return toStaffPointLedgerListDto(result);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('students/:studentId/badges')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff list student badge awards',
    description:
      'Scoped staff read. Omits awardedByUserId and ruleConfig. Parent deferred to #006.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiOkResponse({ type: StaffStudentBadgeListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listStudentBadges(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<StaffStudentBadgeListResponseDto> {
    try {
      await this.gamificationAccessService.assertStaffCanReadStudentGamification(
        authenticatedUser.userId,
        studentId,
      );
      const items = await this.gamificationService.listStaffStudentBadges(studentId);
      return toStaffStudentBadgeListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('students/:studentId/milestones')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff list student milestone achievements',
    description: 'Scoped staff read. Omits internal source IDs. Parent deferred to #006.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiOkResponse({ type: StaffStudentMilestoneListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listStudentMilestones(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<StaffStudentMilestoneListResponseDto> {
    try {
      await this.gamificationAccessService.assertStaffCanReadStudentGamification(
        authenticatedUser.userId,
        studentId,
      );
      const items = await this.gamificationService.listStaffStudentMilestones(studentId);
      return toStaffStudentMilestoneListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
