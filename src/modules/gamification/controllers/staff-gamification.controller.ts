import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { GamificationSummaryResponseDto } from '../dto/gamification-response.dto';
import { ListPointsQueryDto } from '../dto/list-points-query.dto';
import { PointLedgerListStaffResponseDto } from '../dto/gamification-response.dto';
import { GamificationService } from '../gamification.service';
import {
  toGamificationSummaryResponseDto,
  toStaffPointLedgerListDto,
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

  @Get('students/:studentId/points')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff paginated point ledger for a student',
    description: 'createdAt DESC, id DESC. Max 50. Includes staffNote.',
  })
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
}
