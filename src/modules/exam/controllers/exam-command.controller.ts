import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  EXAM_MANAGE_PERMISSION,
  EXAM_PUBLISH_PERMISSION,
} from '../constants/exam-permissions.constants';
import { ExamPublishValidationErrorDto } from '../dto/exam-publish-validation-error.dto';
import { ExamVersionResponseDto } from '../dto/exam-version-response.dto';
import { toExamVersionResponseDto } from '../mappers/exam-response.mapper';
import { ExamService } from '../services/exam.service';
import { ExamVersionOrchestrationService } from '../services/exam-version-orchestration.service';
import { rethrowExamServiceError } from '../utils/exam-http.util';

@ApiTags('exam-commands')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ExamCommandController {
  constructor(
    private readonly examService: ExamService,
    private readonly examVersionOrchestrationService: ExamVersionOrchestrationService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('exam-versions/:versionId/publish')
  @RequirePermissions(EXAM_PUBLISH_PERMISSION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft exam version' })
  @ApiOkResponse({ type: ExamVersionResponseDto })
  @ApiUnprocessableEntityResponse({ type: ExamPublishValidationErrorDto })
  async publishVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<ExamVersionResponseDto> {
    try {
      const parishId = await this.examService.getVersionExamParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examVersionOrchestrationService.publishVersion(
        versionId,
        authenticatedUser.userId,
      );

      return toExamVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Post('exam-versions/:versionId/clone-to-draft')
  @RequirePermissions(EXAM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Clone a published or archived exam version to a new draft' })
  @ApiCreatedResponse({ type: ExamVersionResponseDto })
  async cloneVersionToDraft(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<ExamVersionResponseDto> {
    try {
      const parishId = await this.examService.getVersionExamParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examVersionOrchestrationService.cloneVersionToDraft(versionId);

      return toExamVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }
}
