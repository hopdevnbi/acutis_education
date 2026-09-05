import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { BADGES_AWARD_PERMISSION } from '../constants/gamification-permissions.constants';
import { BadgeAwardActionResponseDto } from '../dto/badge.dto';
import { GamificationService } from '../gamification.service';
import { toBadgeAwardActionResponseDto } from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller('students')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class StaffBadgeAwardController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Post(':studentId/badges/:badgeId/awards')
  @RequirePermissions(BADGES_AWARD_PERMISSION)
  @ApiOperation({
    summary: 'Manually award a badge to a student',
    description:
      'Permission: badges.award. SuperAdmin / ParishAdmin own parish / Catechist assigned class. Duplicate active award returns existing (idempotent). Server derives enrollment/parish.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiParam({ name: 'badgeId', format: 'uuid' })
  @ApiCreatedResponse({ type: BadgeAwardActionResponseDto })
  @ApiOkResponse({ type: BadgeAwardActionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async award(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Param('badgeId') badgeId: string,
  ): Promise<BadgeAwardActionResponseDto> {
    try {
      const result = await this.gamificationService.awardBadgeManually({
        actorUserId: authenticatedUser.userId,
        studentId,
        badgeId,
      });
      return toBadgeAwardActionResponseDto(result.award);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Post(':studentId/badges/:badgeId/revoke')
  @RequirePermissions(BADGES_AWARD_PERMISSION)
  @ApiOperation({
    summary: 'Soft-revoke a badge award',
    description:
      'Sets revokedAt. Does not delete. Reverses badge bonus once if present. Repeated revoke returns 409.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiParam({ name: 'badgeId', format: 'uuid' })
  @ApiOkResponse({ type: BadgeAwardActionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async revoke(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Param('badgeId') badgeId: string,
  ): Promise<BadgeAwardActionResponseDto> {
    try {
      const result = await this.gamificationService.revokeBadgeManually({
        actorUserId: authenticatedUser.userId,
        studentId,
        badgeId,
      });
      return toBadgeAwardActionResponseDto(result.award);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
