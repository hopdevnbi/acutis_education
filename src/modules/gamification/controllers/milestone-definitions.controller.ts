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
import { GamificationAccessService } from '../access/gamification-access.service';
import { GAMIFICATION_MANAGE_PERMISSION } from '../constants/gamification-permissions.constants';
import {
  CreateMilestoneDefinitionDto,
  MilestoneDefinitionListResponseDto,
  MilestoneDefinitionResponseDto,
  UpdateMilestoneDefinitionDto,
} from '../dto/milestone.dto';
import { GamificationService } from '../gamification.service';
import {
  toMilestoneDefinitionListResponseDto,
  toMilestoneDefinitionResponseDto,
} from '../mappers/gamification-http.mapper';
import { rethrowGamificationServiceError } from '../utils/gamification-http.util';

@ApiTags('gamification')
@Controller('milestones')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class MilestoneDefinitionsController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly gamificationAccessService: GamificationAccessService,
  ) {}

  @Get()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'List milestone definitions',
    description: 'Permission: gamification.manage. SuperAdmin only. No sacramental triggers.',
  })
  @ApiOkResponse({ type: MilestoneDefinitionListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async list(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<MilestoneDefinitionListResponseDto> {
    try {
      await this.gamificationAccessService.assertCanManageMilestoneDefinitions(
        authenticatedUser.userId,
      );
      const items = await this.gamificationService.listMilestoneDefinitions();
      return toMilestoneDefinitionListResponseDto(items);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Get(':milestoneId')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Get milestone definition by id' })
  @ApiParam({ name: 'milestoneId', format: 'uuid' })
  @ApiOkResponse({ type: MilestoneDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('milestoneId') milestoneId: string,
  ): Promise<MilestoneDefinitionResponseDto> {
    try {
      await this.gamificationAccessService.assertCanManageMilestoneDefinitions(
        authenticatedUser.userId,
      );
      const item = await this.gamificationService.getMilestoneDefinitionById(milestoneId);
      return toMilestoneDefinitionResponseDto(item);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Post()
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Create milestone definition',
    description: 'SuperAdmin only. System/learning triggers only — no sacramental types.',
  })
  @ApiCreatedResponse({ type: MilestoneDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  async create(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() body: CreateMilestoneDefinitionDto,
  ): Promise<MilestoneDefinitionResponseDto> {
    try {
      await this.gamificationAccessService.assertCanManageMilestoneDefinitions(
        authenticatedUser.userId,
      );
      const item = await this.gamificationService.createMilestoneDefinition({
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        triggerType: body.triggerType,
        triggerConfigJson: body.triggerConfigJson ?? null,
        sortOrder: body.sortOrder,
      });
      return toMilestoneDefinitionResponseDto(item);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }

  @Patch(':milestoneId')
  @RequirePermissions(GAMIFICATION_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Update milestone definition',
    description: 'SuperAdmin only. ACTIVE -> ARCHIVED. Historical achievements retained.',
  })
  @ApiParam({ name: 'milestoneId', format: 'uuid' })
  @ApiOkResponse({ type: MilestoneDefinitionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async update(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('milestoneId') milestoneId: string,
    @Body() body: UpdateMilestoneDefinitionDto,
  ): Promise<MilestoneDefinitionResponseDto> {
    try {
      await this.gamificationAccessService.assertCanManageMilestoneDefinitions(
        authenticatedUser.userId,
      );
      const item = await this.gamificationService.updateMilestoneDefinition(milestoneId, {
        code: body.code,
        name: body.name,
        description: body.description,
        status: body.status,
        triggerType: body.triggerType,
        triggerConfigJson: body.triggerConfigJson,
        sortOrder: body.sortOrder,
      });
      return toMilestoneDefinitionResponseDto(item);
    } catch (error: unknown) {
      rethrowGamificationServiceError(error);
    }
  }
}
