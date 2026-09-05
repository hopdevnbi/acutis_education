import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { GamificationAccessService } from '../access/gamification-access.service';
import { GAMIFICATION_MANAGE_PERMISSION } from '../constants/gamification-permissions.constants';
import {
  CreateRewardRuleDto,
  RewardRuleListResponseDto,
  RewardRuleResponseDto,
  UpdateRewardRuleDto,
} from '../dto/reward-rule.dto';
import { RewardScopeType } from '../enums/gamification.enums';
import { GamificationAccessDeniedError } from '../errors/gamification.errors';
import { GamificationService } from '../gamification.service';
import {
  toRewardRuleListResponseDto,
  toRewardRuleResponseDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller('reward-rules')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class RewardRulesController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Get()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'List reward rules',
    description:
      'SuperAdmin sees all. ParishAdmin sees GLOBAL + own parish. Catechist denied by capability scope.',
  })
  @ApiOkResponse({ type: RewardRuleListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async list(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<RewardRuleListResponseDto> {
    try {
      if (await this.gamificationAccessService.isSuperAdmin(authenticatedUser.userId)) {
        const rules = await this.gamificationService.listRewardRules({ includeGlobal: true });
        return toRewardRuleListResponseDto(rules);
      }

      const memberships = await this.parishScopeService.listActiveParishIdsForMember(
        authenticatedUser.userId,
      );
      const parishId = memberships[0];
      await this.gamificationAccessService.assertCanReadRewardRules(
        authenticatedUser.userId,
        parishId,
      );
      const rules = await this.gamificationService.listRewardRules({
        parishId,
        includeGlobal: true,
      });
      return toRewardRuleListResponseDto(rules);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Post()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Create reward rule',
    description: 'Catechist cannot manage reward rules. ParishAdmin PARISH scope only.',
  })
  @ApiCreatedResponse({ type: RewardRuleResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  async create(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() body: CreateRewardRuleDto,
  ): Promise<RewardRuleResponseDto> {
    try {
      await this.gamificationAccessService.assertCanManageRewardRules(authenticatedUser.userId, {
        scopeType: body.scopeType,
        parishId: body.parishId ?? null,
      });
      const rule = await this.gamificationService.createRewardRule({
        code: body.code,
        eventType: body.eventType,
        sourceType: body.sourceType,
        points: body.points,
        status: body.status,
        maxAwardsPerSource: body.maxAwardsPerSource,
        scopeType: body.scopeType,
        parishId: body.parishId ?? null,
        effectiveFrom: body.effectiveFrom ?? null,
        effectiveTo: body.effectiveTo ?? null,
        conditionConfigJson: body.conditionConfigJson ?? null,
      });
      return toRewardRuleResponseDto(rule);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Patch(':id')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update reward rule' })
  @ApiOkResponse({ type: RewardRuleResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async update(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateRewardRuleDto,
  ): Promise<RewardRuleResponseDto> {
    try {
      const existing = await this.gamificationService.getRewardRuleById(id);
      await this.gamificationAccessService.assertCanManageRewardRules(authenticatedUser.userId, {
        scopeType: existing.scopeType,
        parishId: existing.parishId,
      });
      if (
        existing.scopeType === RewardScopeType.Global &&
        !(await this.gamificationAccessService.isSuperAdmin(authenticatedUser.userId))
      ) {
        throw new GamificationAccessDeniedError();
      }
      const rule = await this.gamificationService.updateRewardRule(id, {
        points: body.points,
        status: body.status,
        maxAwardsPerSource: body.maxAwardsPerSource,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo,
        conditionConfigJson: body.conditionConfigJson,
        sourceType: body.sourceType,
      });
      return toRewardRuleResponseDto(rule);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
