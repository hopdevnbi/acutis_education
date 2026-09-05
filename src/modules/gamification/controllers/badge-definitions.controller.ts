import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { GamificationAccessService } from '../access/gamification-access.service';
import { GAMIFICATION_MANAGE_PERMISSION } from '../constants/gamification-permissions.constants';
import {
  BadgeDefinitionListResponseDto,
  BadgeDefinitionResponseDto,
  CreateBadgeDefinitionDto,
  UpdateBadgeDefinitionDto,
} from '../dto/badge.dto';
import { BadgeScopeType } from '../enums/gamification.enums';
import { GamificationAccessDeniedError } from '../errors/gamification.errors';
import { GamificationService } from '../gamification.service';
import {
  toBadgeDefinitionListResponseDto,
  toBadgeDefinitionResponseDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller('badges')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class BadgeDefinitionsController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Get()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'List badge definitions',
    description:
      'Permission: gamification.manage. SuperAdmin: all. ParishAdmin: GLOBAL + own parish. Catechist denied.',
  })
  @ApiOkResponse({ type: BadgeDefinitionListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async list(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<BadgeDefinitionListResponseDto> {
    try {
      if (await this.gamificationAccessService.isSuperAdmin(authenticatedUser.userId)) {
        const badges = await this.gamificationService.listBadgeDefinitions({ includeGlobal: true });
        return toBadgeDefinitionListResponseDto(badges);
      }
      const memberships = await this.parishScopeService.listActiveParishIdsForMember(
        authenticatedUser.userId,
      );
      const parishId = memberships[0];
      await this.gamificationAccessService.assertCanReadBadgeDefinitions(
        authenticatedUser.userId,
        parishId,
      );
      const badges = await this.gamificationService.listBadgeDefinitions({
        parishId,
        includeGlobal: true,
      });
      return toBadgeDefinitionListResponseDto(badges);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get(':badgeId')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Get badge definition by id' })
  @ApiParam({ name: 'badgeId', format: 'uuid' })
  @ApiOkResponse({ type: BadgeDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('badgeId') badgeId: string,
  ): Promise<BadgeDefinitionResponseDto> {
    try {
      const badge = await this.gamificationService.getBadgeDefinitionById(badgeId);
      await this.gamificationAccessService.assertCanManageBadgeDefinitions(
        authenticatedUser.userId,
        { scopeType: badge.scopeType, parishId: badge.parishId },
      );
      return toBadgeDefinitionResponseDto(badge);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Post()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Create badge definition',
    description: 'Catechist denied. ParishAdmin PARISH own parish only. Starts as DRAFT.',
  })
  @ApiCreatedResponse({ type: BadgeDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  async create(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() body: CreateBadgeDefinitionDto,
  ): Promise<BadgeDefinitionResponseDto> {
    try {
      await this.gamificationAccessService.assertCanManageBadgeDefinitions(
        authenticatedUser.userId,
        { scopeType: body.scopeType, parishId: body.parishId ?? null },
      );
      const badge = await this.gamificationService.createBadgeDefinition({
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        category: body.category,
        scopeType: body.scopeType,
        parishId: body.parishId ?? null,
        awardMode: body.awardMode,
        ruleEventType: body.ruleEventType ?? null,
        ruleConfigJson: body.ruleConfigJson ?? null,
        pointsBonus: body.pointsBonus ?? null,
        iconMediaAssetId: body.iconMediaAssetId ?? null,
      });
      return toBadgeDefinitionResponseDto(badge);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Patch(':badgeId')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Update badge definition',
    description: 'Lifecycle DRAFT->ACTIVE->ARCHIVED or DRAFT->ARCHIVED. No ARCHIVED->ACTIVE in MVP.',
  })
  @ApiParam({ name: 'badgeId', format: 'uuid' })
  @ApiOkResponse({ type: BadgeDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async update(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('badgeId') badgeId: string,
    @Body() body: UpdateBadgeDefinitionDto,
  ): Promise<BadgeDefinitionResponseDto> {
    try {
      const existing = await this.gamificationService.getBadgeDefinitionById(badgeId);
      await this.gamificationAccessService.assertCanManageBadgeDefinitions(
        authenticatedUser.userId,
        { scopeType: existing.scopeType, parishId: existing.parishId },
      );
      if (
        existing.scopeType === BadgeScopeType.Global &&
        !(await this.gamificationAccessService.isSuperAdmin(authenticatedUser.userId))
      ) {
        throw new GamificationAccessDeniedError();
      }
      const badge = await this.gamificationService.updateBadgeDefinition(badgeId, {
        code: body.code,
        name: body.name,
        description: body.description,
        category: body.category,
        scopeType: body.scopeType,
        parishId: body.parishId,
        status: body.status,
        awardMode: body.awardMode,
        ruleEventType: body.ruleEventType,
        ruleConfigJson: body.ruleConfigJson,
        pointsBonus: body.pointsBonus,
        iconMediaAssetId: body.iconMediaAssetId,
      });
      return toBadgeDefinitionResponseDto(badge);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
