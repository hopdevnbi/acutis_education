import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { POINTS_ADJUST_PERMISSION } from '../constants/gamification-permissions.constants';
import { ManualPointAdjustmentResponseDto } from '../dto/gamification-response.dto';
import { ManualPointAdjustmentDto } from '../dto/manual-point-adjustment.dto';
import { GamificationService } from '../gamification.service';
import { toManualAdjustmentResponseDto } from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class StaffPointsController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Post('students/:studentId/points/adjustments')
  @HttpCode(200)
  @RequirePermissions(POINTS_ADJUST_PERMISSION)
  @ApiOperation({
    summary: 'Manual point ledger adjustment',
    description:
      'Server derives parish/enrollment/year from ACTIVE enrollment. Client cannot supply actor, source, or parish.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiOkResponse({ type: ManualPointAdjustmentResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiUnprocessableEntityResponse()
  async adjustPoints(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Body() body: ManualPointAdjustmentDto,
  ): Promise<ManualPointAdjustmentResponseDto> {
    try {
      const entry = await this.gamificationService.adjustStudentPoints({
        studentId,
        actorUserId: authenticatedUser.userId,
        delta: body.delta,
        reason: body.reason,
      });
      return toManualAdjustmentResponseDto(entry);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
