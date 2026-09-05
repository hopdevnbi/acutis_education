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
  ClassMissionListQueryDto,
  MissionDefinitionListResponseDto,
  MissionProgressListQueryDto,
  MissionProgressListResponseDto,
} from '../dto/mission.dto';
import { MissionDefinitionStatus } from '../enums/gamification.enums';
import { GamificationService } from '../gamification.service';
import {
  toMissionDefinitionListResponseDto,
  toMissionProgressListResponseDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class StaffMissionsController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
  ) {}

  @Get('classes/:classId/missions')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'List missions for a class',
    description:
      'gamification.read. SuperAdmin / ParishAdmin own parish / Catechist assigned class. Default status=ACTIVE.',
  })
  @ApiParam({ name: 'classId', format: 'uuid' })
  @ApiOkResponse({ type: MissionDefinitionListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listClassMissions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query() query: ClassMissionListQueryDto,
  ): Promise<MissionDefinitionListResponseDto> {
    try {
      await this.gamificationAccessService.assertCanReadClassMissions(
        authenticatedUser.userId,
        classId,
      );
      const items = await this.gamificationService.listClassMissions(classId, {
        status: query.status ?? MissionDefinitionStatus.Active,
      });
      return toMissionDefinitionListResponseDto({
        items,
        page: 1,
        limit: items.length,
        total: items.length,
        totalPages: items.length === 0 ? 0 : 1,
      });
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get('missions/:missionId/progress')
  @RequirePermissions(GAMIFICATION_READ_PERMISSION)
  @ApiOperation({
    summary: 'List mission progress (staff)',
    description:
      'Paginated max 50. Catechist on GLOBAL/PARISH must pass classId of assigned class; only those students returned.',
  })
  @ApiParam({ name: 'missionId', format: 'uuid' })
  @ApiOkResponse({ type: MissionProgressListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async listMissionProgress(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('missionId') missionId: string,
    @Query() query: MissionProgressListQueryDto,
  ): Promise<MissionProgressListResponseDto> {
    try {
      const mission = await this.gamificationService.getMissionDefinitionById(missionId);
      const { studentIdsFilter } =
        await this.gamificationAccessService.assertCanReadMissionProgress(
          authenticatedUser.userId,
          mission,
          { classId: query.classId ?? null },
        );
      const result = await this.gamificationService.listMissionProgressForStaff({
        missionDefinitionId: missionId,
        page: query.page,
        limit: query.limit,
        status: query.status,
        studentIds: studentIdsFilter ?? undefined,
      });
      return toMissionProgressListResponseDto(result);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
