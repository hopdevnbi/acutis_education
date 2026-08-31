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
import { QuestionPublishValidationErrorDto } from '../dto/publish-validation-error.dto';
import { QuestionVersionResponseDto } from '../dto/question-version-response.dto';
import { ReplaceQuestionOptionsRequestDto } from '../dto/replace-question-options-request.dto';
import { SetCorrectOptionsRequestDto } from '../dto/set-correct-options-request.dto';
import { UpdateQuestionVersionRequestDto } from '../dto/update-question-version-request.dto';
import {
  toQuestionAuthoringResponse,
  toQuestionOptionListResponse,
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
