import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import {
  CATECHIST_ROLE_CODE,
  PARISH_ADMIN_ROLE_CODE,
} from '../../access-control/constants/role-codes.constants';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { GamificationAccessService } from '../access/gamification-access.service';
import { GAMIFICATION_MANAGE_PERMISSION } from '../constants/gamification-permissions.constants';
import {
  CreateMissionDefinitionDto,
  MissionAdminListQueryDto,
  MissionDefinitionListResponseDto,
  MissionDefinitionResponseDto,
  UpdateMissionDefinitionDto,
} from '../dto/mission.dto';
import { MissionScopeType } from '../enums/gamification.enums';
import { GamificationService } from '../gamification.service';
import {
  toMissionDefinitionListResponseDto,
  toMissionDefinitionResponseDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller('missions')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class MissionDefinitionsController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Get()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'List mission definitions (admin)',
    description:
      'gamification.manage. SuperAdmin all; ParishAdmin own parish PARISH/CLASS; Catechist assigned CLASS only.',
  })
  @ApiOkResponse({ type: MissionDefinitionListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async list(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: MissionAdminListQueryDto,
  ): Promise<MissionDefinitionListResponseDto> {
    try {
      const scope = await this.resolveAdminListScope(authenticatedUser.userId);
      const result = await this.gamificationService.listMissionDefinitions({
        page: query.page,
        limit: query.limit,
        status: query.status,
        scopeType: query.scopeType,
        parishId: query.parishId,
        classId: query.classId,
        conditionType: query.conditionType,
        parishIds: scope.parishIds,
        classIds: scope.classIds,
      });
      return toMissionDefinitionListResponseDto(result);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get(':missionId')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Get mission definition by id' })
  @ApiParam({ name: 'missionId', format: 'uuid' })
  @ApiOkResponse({ type: MissionDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('missionId') missionId: string,
  ): Promise<MissionDefinitionResponseDto> {
    try {
      const mission = await this.gamificationService.getMissionDefinitionById(missionId);
      await this.gamificationAccessService.assertCanReadMissionDefinition(
        authenticatedUser.userId,
        mission,
      );
      return toMissionDefinitionResponseDto(mission);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Post()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Create DRAFT mission definition',
    description: 'Starts as DRAFT. Activate via POST .../activate. No historical backfill.',
  })
  @ApiCreatedResponse({ type: MissionDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  async create(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() body: CreateMissionDefinitionDto,
  ): Promise<MissionDefinitionResponseDto> {
    try {
      let parishId = body.parishId ?? null;
      if (body.scopeType === MissionScopeType.Class && body.classId && !parishId) {
        const classSnap = await this.gamificationService.resolveClassParishId(body.classId);
        parishId = classSnap;
      }
      await this.gamificationAccessService.assertCanManageMissionDefinition(
        authenticatedUser.userId,
        {
          scopeType: body.scopeType,
          parishId,
          classId: body.classId ?? null,
        },
      );
      const mission = await this.gamificationService.createMissionDefinition({
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        scopeType: body.scopeType,
        parishId,
        classId: body.classId ?? null,
        conditionType: body.conditionType,
        targetCount: body.targetCount,
        pointsBonus: body.pointsBonus ?? null,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
      });
      return toMissionDefinitionResponseDto(mission);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Patch(':missionId')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Update mission definition',
    description:
      'DRAFT: full edit. ACTIVE: name/description/endsAt only. No status via PATCH — use activate/archive.',
  })
  @ApiParam({ name: 'missionId', format: 'uuid' })
  @ApiOkResponse({ type: MissionDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async update(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('missionId') missionId: string,
    @Body() body: UpdateMissionDefinitionDto,
  ): Promise<MissionDefinitionResponseDto> {
    try {
      const existing = await this.gamificationService.getMissionDefinitionById(missionId);
      await this.gamificationAccessService.assertCanManageMissionDefinition(
        authenticatedUser.userId,
        {
          scopeType: existing.scopeType,
          parishId: existing.parishId,
          classId: existing.classId,
        },
      );
      const mission = await this.gamificationService.updateMissionDefinition(missionId, {
        code: body.code,
        name: body.name,
        description: body.description,
        scopeType: body.scopeType,
        parishId: body.parishId,
        classId: body.classId,
        conditionType: body.conditionType,
        targetCount: body.targetCount,
        pointsBonus: body.pointsBonus,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      });
      return toMissionDefinitionResponseDto(mission);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Post(':missionId/activate')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Activate DRAFT mission',
    description: 'DRAFT -> ACTIVE. No historical event backfill in MVP.',
  })
  @ApiParam({ name: 'missionId', format: 'uuid' })
  @ApiOkResponse({ type: MissionDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async activate(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('missionId') missionId: string,
  ): Promise<MissionDefinitionResponseDto> {
    try {
      const existing = await this.gamificationService.getMissionDefinitionById(missionId);
      await this.gamificationAccessService.assertCanManageMissionDefinition(
        authenticatedUser.userId,
        {
          scopeType: existing.scopeType,
          parishId: existing.parishId,
          classId: existing.classId,
        },
      );
      const mission = await this.gamificationService.activateMissionDefinition(missionId);
      return toMissionDefinitionResponseDto(mission);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Post(':missionId/archive')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Archive mission',
    description: 'DRAFT|ACTIVE -> ARCHIVED. Progress retained; no new increments.',
  })
  @ApiParam({ name: 'missionId', format: 'uuid' })
  @ApiOkResponse({ type: MissionDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async archive(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('missionId') missionId: string,
  ): Promise<MissionDefinitionResponseDto> {
    try {
      const existing = await this.gamificationService.getMissionDefinitionById(missionId);
      await this.gamificationAccessService.assertCanManageMissionDefinition(
        authenticatedUser.userId,
        {
          scopeType: existing.scopeType,
          parishId: existing.parishId,
          classId: existing.classId,
        },
      );
      const mission = await this.gamificationService.archiveMissionDefinition(missionId);
      return toMissionDefinitionResponseDto(mission);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  private async resolveAdminListScope(userId: string): Promise<{
    parishIds?: string[];
    classIds?: string[];
  }> {
    if (await this.gamificationAccessService.isSuperAdmin(userId)) {
      return {};
    }
    if (await this.gamificationAccessService.hasRole(userId, PARISH_ADMIN_ROLE_CODE)) {
      const parishIds = await this.parishScopeService.listActiveParishIdsForMember(userId);
      return { parishIds };
    }
    if (await this.gamificationAccessService.hasRole(userId, CATECHIST_ROLE_CODE)) {
      const classIds =
        await this.gamificationAccessService.listAssignedClassIdsForCatechist(userId);
      return { classIds };
    }
    // Force empty via impossible class filter
    return { classIds: [] };
  }
}
