import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  QUESTION_MANAGE_PERMISSION,
  QUESTION_PUBLISH_PERMISSION,
  QUESTION_READ_PERMISSION,
} from '../constants/question-permissions.constants';
import { QuestionAuthoringResponseDto } from '../dto/question-authoring-response.dto';
import { QuestionOptionListResponseDto } from '../dto/question-option-response.dto';
import { QuestionExportPackageV1Dto } from '../dto/question-export-package-v1.dto';
import { QuestionPublishValidationErrorDto } from '../dto/publish-validation-error.dto';
import { QuestionVersionPreviewResponseDto } from '../dto/question-version-preview-response.dto';
import { QuestionVersionResponseDto } from '../dto/question-version-response.dto';
import { ReplaceQuestionOptionsRequestDto } from '../dto/replace-question-options-request.dto';
import { SetCorrectOptionsRequestDto } from '../dto/set-correct-options-request.dto';
import { UpdateQuestionVersionRequestDto } from '../dto/update-question-version-request.dto';
import {
  toQuestionAuthoringResponse,
  toQuestionExportPackageResponse,
  toQuestionOptionListResponse,
  toQuestionVersionPreviewResponse,
  toQuestionVersionResponse,
} from '../mappers/question-bank-response.mapper';
import { QuestionBankService } from '../services/question-bank.service';
import { QuestionOptionService } from '../services/question-option.service';
import { rethrowQuestionBankServiceError } from '../utils/question-http.util';

@ApiTags('question-versions')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class QuestionVersionController {
  constructor(
    private readonly questionBankService: QuestionBankService,
    private readonly questionOptionService: QuestionOptionService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Get('question-versions/:versionId')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a question version by id' })
  @ApiOkResponse({ type: QuestionVersionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing questions.read permission or parish scope' })
  async getVersionById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionVersionResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.getVersionById(versionId);

      return toQuestionVersionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('question-versions/:versionId/preview')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Preview a question version with learner-safe fields (author/admin)',
    description:
      'Returns learner-safe projection without correct answers, explanation, or option codes. Allows DRAFT for editor preview.',
  })
  @ApiOkResponse({ type: QuestionVersionPreviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing questions.read permission or parish scope' })
  async getVersionPreview(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionVersionPreviewResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const preview = await this.questionBankService.getQuestionVersionPreview(versionId);

      return toQuestionVersionPreviewResponse(preview);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('question-versions/:versionId/export')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({
    summary: 'Export a question version as a portable JSON package (schema v1)',
    description:
      'Read-only export for admin workflows. Includes tag codes and curriculum links. Media asset ids are environment-local.',
  })
  @ApiOkResponse({ type: QuestionExportPackageV1Dto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing questions.read permission or parish scope' })
  async exportVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionExportPackageV1Dto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const exportPackage = await this.questionBankService.exportQuestionVersion(versionId);

      return toQuestionExportPackageResponse(exportPackage) as QuestionExportPackageV1Dto;
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('question-versions/:versionId/authoring')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get authoring snapshot for a question version' })
  @ApiOkResponse({ type: QuestionAuthoringResponseDto })
  async getAuthoringSnapshot(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionAuthoringResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.getAuthoringSnapshot(versionId);

      return toQuestionAuthoringResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('question-versions/:versionId/options')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'List options for a question version' })
  @ApiOkResponse({ type: QuestionOptionListResponseDto })
  async listOptions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionOptionListResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const options = await this.questionOptionService.listOptionsByVersion(versionId);

      return toQuestionOptionListResponse(options);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Patch('question-versions/:versionId')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update a draft question version' })
  @ApiOkResponse({ type: QuestionVersionResponseDto })
  async updateDraftVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: UpdateQuestionVersionRequestDto,
  ): Promise<QuestionVersionResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.updateDraftVersion(versionId, {
        questionType: request.questionType,
        prompt: request.prompt,
        instruction: request.instruction,
        explanation: request.explanation,
        difficulty: request.difficulty,
        promptMediaJson: request.promptMediaJson,
        explanationMediaJson: request.explanationMediaJson,
      });

      return toQuestionVersionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Put('question-versions/:versionId/options')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Replace all options on a draft question version' })
  @ApiOkResponse({ type: QuestionOptionListResponseDto })
  async replaceOptions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: ReplaceQuestionOptionsRequestDto,
  ): Promise<QuestionOptionListResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const options = await this.questionOptionService.replaceDraftOptions(
        versionId,
        request.items,
      );

      return toQuestionOptionListResponse(options);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Put('question-versions/:versionId/correct-options')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Set correct options on a draft question version' })
  @ApiOkResponse({
    schema: { properties: { optionIds: { type: 'array', items: { type: 'string' } } } },
  })
  async setCorrectOptions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: SetCorrectOptionsRequestDto,
  ): Promise<{ optionIds: string[] }> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const optionIds = await this.questionOptionService.setCorrectOptions(
        versionId,
        request.optionIds,
      );

      return { optionIds };
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Post('question-versions/:versionId/clone-to-draft')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Clone a published or archived question version to a new draft' })
  @ApiOkResponse({ type: QuestionAuthoringResponseDto })
  async cloneVersionToDraft(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionAuthoringResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.cloneVersionToDraft(
        versionId,
        authenticatedUser.userId,
      );

      return toQuestionAuthoringResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Post('question-versions/:versionId/publish')
  @RequirePermissions(QUESTION_PUBLISH_PERMISSION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft question version' })
  @ApiOkResponse({ type: QuestionVersionResponseDto })
  @ApiUnprocessableEntityResponse({ type: QuestionPublishValidationErrorDto })
  async publishDraftVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionVersionResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.publishDraftVersion(
        versionId,
        authenticatedUser.userId,
      );

      return toQuestionVersionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }
}
