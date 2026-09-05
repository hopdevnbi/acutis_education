import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
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
import { ListPointsQueryDto } from '../dto/list-points-query.dto';
import { GamificationService } from '../gamification.service';
import {
  toGamificationSummaryResponseDto,
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
}
