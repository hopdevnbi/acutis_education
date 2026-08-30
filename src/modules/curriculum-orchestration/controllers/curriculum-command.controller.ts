import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  CURRICULUM_MANAGE_PERMISSION,
  CURRICULUM_PUBLISH_PERMISSION,
  CURRICULUM_READ_PERMISSION,
} from '../../curriculum/constants/curriculum-permissions.constants';
import { CurriculumAssignmentResponseDto } from '../../curriculum/dto/curriculum-assignment-response.dto';
import { CurriculumVersionResponseDto } from '../../curriculum/dto/curriculum-version-response.dto';
import { CurriculumPublishValidationErrorDto } from '../../curriculum/dto/publish-validation-error.dto';
import { UpsertCurriculumAssignmentRequestDto } from '../../curriculum/dto/upsert-curriculum-assignment-request.dto';
import {
  toCurriculumAssignmentResponseDto,
  toCurriculumVersionResponseDto,
} from '../../curriculum/mappers/curriculum-response.mapper';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { rethrowCurriculumServiceError } from '../../curriculum/utils/curriculum-http.util';
import { CurriculumVersionOrchestrationService } from '../services/curriculum-version-orchestration.service';

@ApiTags('curriculum-commands')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class CurriculumCommandController {
  constructor(
    private readonly curriculumService: CurriculumService,
    private readonly curriculumVersionOrchestrationService: CurriculumVersionOrchestrationService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('curriculum-versions/:id/publish')
  @RequirePermissions(CURRICULUM_PUBLISH_PERMISSION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft curriculum version' })
  @ApiOkResponse({ type: CurriculumVersionResponseDto })
  @ApiUnprocessableEntityResponse({ type: CurriculumPublishValidationErrorDto })
  async publishVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') versionId: string,
  ): Promise<CurriculumVersionResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumVersionOrchestrationService.publishVersion(
        versionId,
        authenticatedUser.userId,
      );

      return toCurriculumVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Post('curriculum-versions/:id/clone-to-draft')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Clone a published or archived curriculum version to a new draft' })
  @ApiCreatedResponse({ type: CurriculumVersionResponseDto })
  async cloneVersionToDraft(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') versionId: string,
  ): Promise<CurriculumVersionResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumVersionOrchestrationService.cloneVersionToDraft(
        versionId,
        authenticatedUser.userId,
      );

      return toCurriculumVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('parishes/:parishId/academic-years/:yearId/catechism-levels/:levelId/curriculum-assignment')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get curriculum assignment for a parish academic year and level' })
  @ApiOkResponse({ type: CurriculumAssignmentResponseDto })
  async getCurriculumAssignment(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Param('yearId') yearId: string,
    @Param('levelId') levelId: string,
  ): Promise<CurriculumAssignmentResponseDto> {
    try {
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.getCurriculumAssignment(
        parishId,
        yearId,
        levelId,
      );

      return toCurriculumAssignmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Put('parishes/:parishId/academic-years/:yearId/catechism-levels/:levelId/curriculum-assignment')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Upsert curriculum assignment for a parish academic year and level' })
  @ApiOkResponse({ type: CurriculumAssignmentResponseDto })
  async upsertCurriculumAssignment(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Param('yearId') yearId: string,
    @Param('levelId') levelId: string,
    @Body() request: UpsertCurriculumAssignmentRequestDto,
  ): Promise<CurriculumAssignmentResponseDto> {
    try {
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.upsertCurriculumAssignment(
        parishId,
        yearId,
        levelId,
        {
          curriculumVersionId: request.curriculumVersionId,
          assignedByUserId: authenticatedUser.userId,
        },
      );

      return toCurriculumAssignmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }
}
